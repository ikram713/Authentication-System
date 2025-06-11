const express = require("express");
const passport = require("passport");
const bcrypt = require("bcryptjs");// const LocalUser = require("Models/LocalUser.js");
const GoogleUser = require("../Models/GoogleUser.js");
const LocalUser = require("../Models/LocalUser.js");
const sendOtpEmail = require("../Config/sendOtp");
const router = express.Router();
const validator = require("validator");



//  Local Signup Route
router.post("/signup", async (req, res) => {
    try {
      const { name, email, password } = req.body;
  
      if (!validator.isEmail(email)) {
        return res.status(400).send("Invalid email format.");
      }
  
      let googleUserExists = await GoogleUser.findOne({ email });
      if (googleUserExists)
        return res.status(400).json({ message: "U are already signed up ,Use Google to log in" });
  
      let localUserExists = await LocalUser.findOne({ email });
      if (localUserExists)
        return res.status(400).json({ message: "Email already registered" });
  
      // ✅ Store user details in session instead of database
      req.session.otpUser = { name, email, password };
  
      // ✅ Generate and hash OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOTP = await bcrypt.hash(otp, 12);
      req.session.otp = hashedOTP;
      req.session.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiration
  
      // ✅ Send OTP email
      await sendOtpEmail(email, otp);
    // console.log(req.session.otp)
      res.json({ message: "OTP sent to email. Please verify to continue." });
  
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  

// ✅ Verify OTP Route
router.post("/verify-otp", async (req, res) => {
    try {
      const { otp } = req.body;
      
      // ✅ Retrieve user details from session
      if (!req.session.otpUser || !req.session.otp) {
        return res.status(400).send("Session expired. Please sign up again.");
      }
  
      const { name, email, password} = req.session.otpUser;
  
      // ✅ Check if OTP expired
      if (req.session.otpExpires < Date.now()) {
        return res.status(400).send("OTP expired. Please request a new one.");
      }
  
      // ✅ Verify OTP
      const isMatch = await bcrypt.compare(otp, req.session.otp);
      if (!isMatch) {
        return res.status(400).send("Incorrect OTP. Please try again.");
      }
  
      // ✅ Check if user already exists
      let user = await LocalUser.findOne({ email });
  
      if (user) {
        // If user exists but is not verified, update it
        user.isVerified = true;
        await user.save();
      } else {
        // Otherwise, create a new user
        const hashedPassword = await bcrypt.hash(password, 10);
        user = new LocalUser({
          name,
          email,
          password: hashedPassword,
          isVerified: true,
        });
        await user.save();
        console.log("✅ New user created:", user);
      }
  
      // ✅ Auto-login user after successful OTP verification
      req.logIn(user, (err) => {
        if (err) return res.status(500).send("Session error. Please log in manually.");
  
        // ✅ Clear OTP from session after successful login
        req.session.otpUser = null;
        req.session.otp = null;
        req.session.otpExpires = null;
  
        res.status(200).json({ message: "Email verified and logged in successfully!", user: req.user });
      });
  
    } catch (error) {
      console.error("❌ Error in verify-otp:", error);
      res.status(500).json({ message: error.message });
    }
  });

  

// ✅ Local Login Route

router.post("/login", async (req, res, next) => {
  try {
    const { email,password } = req.body;

    // Check if the email exists in the database and if it was registered via Google
    const existingUser = await GoogleUser.findOne({ email });

    if (existingUser) {
        return res.status(400).json({
            message: "This email is registered with Google. Please log in with Google.",
        });
    }
  passport.authenticate("local", (err, user, info) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(401).json({ error: info.message });

      req.logIn(user, (err) => {
          if (err) return res.status(500).json({ error: err.message });

          // 🔥 Store user email in session
          req.session.otpUser = { email: user.email };
          req.session.save((err) => {
              if (err) {
                  console.error("Session save error:", err);
                  return res.status(500).json({ message: "Session error" });
              }

              console.log("Session after login:", req.session);
              return res.json({ message: "Login successful", user });
          });
      });
  })(req, res, next);
} catch (error) {
  console.error("Login error:", error);
  return res.status(500).json({ message: "Internal Server Error" });
}
});


// // ✅ Logout Route

router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Error logging out" });
      }

      res.clearCookie("connect.sid"); // Clear session cookie
      res.json({ message: "Logged out successfully" });
    });
  });
});



// ✅ Google Auth Routes
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));


  // 🔹 Google OAuth Callback
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/failure" }),
  (req, res) => {
      console.log("✅ Google Login Successful!");
      console.log("Session after Google login:", req.session);
      console.log("User after Google login:", req.user);

      // Manually save session after authentication (for some session stores)
      req.session.save((err) => {
          if (err) {
              console.error("❌ Error saving session:", err);
              return res.status(500).json({ message: "Session save error" });
          }
          res.redirect("/auth/dashboard"); // Redirect user after successful login
      });
  }
);


router.get("/test-session", (req, res) => {
  console.log("Session Data:", req.session);
  console.log("User in session:", req.user);
  res.json({ session: req.session, user: req.user });
});

  
  router.get("/auth/failure", (req, res) => {
    res.status(401).json({ message: "Authentication failed" });
  });
   
router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
    login: ""  // <-- forces account selection prompt
  })
);



router.get("/github/callback",
  passport.authenticate("github", { failureRedirect: "/auth/failure" }),
  (req, res) => {
    console.log("✅ GitHub Login Successful!");
    console.log("Session after GitHub login:", req.session);
    console.log("User after GitHub login:", req.user);
    res.redirect("/");  // Redirect after successful auth
  }
);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Signup
 *   description: User signup and OTP verification
 */

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Sign up a user (local)
 *     tags: [Signup]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: strongPassword123
 *     responses:
 *       200:
 *         description: OTP sent to email
 *       400:
 *         description: Invalid input or user already exists
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP and complete registration
 *     tags: [Signup]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp
 *             properties:
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: User verified and logged in
 *       400:
 *         description: OTP expired, incorrect, or session missing
 *       500:
 *         description: Internal server error
 */


/**
 * @swagger
 * tags:
 *   name: Login
 *   description: Local login and logout
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in with email and password (local)
 *     tags: [Login]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: strongPassword123
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: User registered with Google
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /auth/logout:
 *   get:
 *     summary: Log out the current user
 *     tags: [Login]
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       500:
 *         description: Session error
 */


/**
 * @swagger
 * tags:
 *   name: GoogleAuth
 *   description: Google OAuth authentication
 */

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags: [GoogleAuth]
 *     responses:
 *       302:
 *         description: Redirects to Google OAuth
 */

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [GoogleAuth]
 *     responses:
 *       302:
 *         description: Redirects to dashboard or failure
 *       500:
 *         description: Session save error
 */

/**
 * @swagger
 * /auth/auth/failure:
 *   get:
 *     summary: Authentication failure redirect
 *     tags: [GoogleAuth]
 *     responses:
 *       401:
 *         description: Authentication failed
 */

/**
 * @swagger
 * /auth/test-session:
 *   get:
 *     summary: Check current session and user
 *     tags: [GoogleAuth]
 *     responses:
 *       200:
 *         description: Returns session and user info
 */

/**
 * @swagger
 * tags:
 *   name: GitHubAuth
 *   description: GitHub OAuth authentication
 */

/**
 * @swagger
 * /auth/github:
 *   get:
 *     summary: Initiate GitHub OAuth login
 *     tags: [GitHubAuth]
 *     responses:
 *       '302':
 *         description: Redirects to GitHub for authentication
 */

/**
 * @swagger
 * /auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     tags: [GitHubAuth]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code returned by GitHub
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter for CSRF protection (if used)
 *     responses:
 *       '302':
 *         description: Redirect to home page or dashboard on success
 *       '401':
 *         description: Authentication failed or unauthorized
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     githubOAuth:
 *       type: oauth2
 *       description: OAuth2 flow using GitHub
 *       flows:
 *         authorizationCode:
 *           authorizationUrl: https://github.com/login/oauth/authorize
 *           tokenUrl: https://github.com/login/oauth/access_token
 *           scopes:
 *             user: Access to user email and profile info
 */

/**
 * @swagger
 * security:
 *   - githubOAuth: [user]
 */
