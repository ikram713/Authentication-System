
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcryptjs");
const LocalUser = require("../Models/LocalUser");
const GoogleUser = require("../Models/GoogleUser");
const GitHubStrategy = require("passport-github2").Strategy;
const GitHubUser = require("../Models/GitHubUser"); // Create this model like GoogleUser

 // Import Admin Model

// 🔹 Local Strategy (For Normal Users)
passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
        const user = await LocalUser.findOne({ email });

        if (!user) return done(null, false, { message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return done(null, false, { message: "Incorrect password..try to reset it" });

        if (!user.isVerified) return done(null, false, { message: "Please verify your email with OTP" });

        return done(null, user);
    } catch (err) {
        return done(err);
    }  })
);

// 🔹 Admin Local Strategy (For Admins)
passport.use(
  "admin-local",
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const admin = await Admin.findOne({ email });

      if (!admin) return done(null, false, { message: "Admin not found" });

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) return done(null, false, { message: "Incorrect password" });

      return done(null, admin);
    } catch (err) {
      return done(err);
    }
  })
);

// 🔹 Google Strategy (For Google OAuth Users)
passport.use(
    new GoogleStrategy(
    {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            let localUser = await LocalUser.findOne({ email: profile.emails[0].value });

        if (localUser) {
          // Link the local user with Google by adding googleId
            localUser.googleId = profile.id;
            await localUser.save();
            return done(null, localUser);
        }

        let googleUser = await GoogleUser.findOne({ email: profile.emails[0].value });

        if (!googleUser) {
            googleUser = new GoogleUser({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            });
            await googleUser.save();
        }

        return done(null, googleUser);
        } catch (err) {
        return done(err);
        }
    }
    )
);


passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/auth/github/callback",
      scope: ["user:email"]
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(null, false, { message: "No email from GitHub profile." });

        let localUser = await LocalUser.findOne({ email });
        if (localUser) {
          localUser.githubId = profile.id;
          await localUser.save();
          return done(null, localUser);
        }

        let githubUser = await GitHubUser.findOne({ email });

        if (!githubUser) {
          githubUser = new GitHubUser({
            githubId: profile.id,
            email,
            name: profile.displayName || profile.username,
          });
          await githubUser.save();
        }

        return done(null, githubUser);
      } catch (err) {
        return done(err);
      }
    }
  )
);

//🔹 Serialize User (Handles Local Users, Google Users, and Admins)
passport.serializeUser((user, done) => {
  done(null, { id: user.id, name: user.name, email: user.email, role: user.role || "user" });
});

// 🔹 Deserialize User
passport.deserializeUser(async (sessionData, done) => {
    try {
    let user =
        (await LocalUser.findById(sessionData.id)) ||
        (await GoogleUser.findById(sessionData.id)) ||
        (await Admin.findById(sessionData.id));

    if (!user) return done(null, false);

    // Attach session-stored info
    user.email = sessionData.email;
    user.name = sessionData.name;
    user.role = sessionData.role;
    user.id = sessionData.id
    done(null, user);
    } catch (err) {
    done(err);
    }
});
module.exports = passport;
