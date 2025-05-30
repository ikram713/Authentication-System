const nodemailer = require("nodemailer");
require("dotenv").config();

// Nodemailer setup
let transporter = nodemailer.createTransport({
  secure: true,
  host: "smtp.gmail.com",
  port: 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOtpEmail = async (email, otp) => {
    
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code To verify ur account in guideMe ",
    text: `Your OTP code is: ${otp}. It will expire in 10 minutes.`
  };

    await transporter.sendMail(mailOptions);
};

module.exports = sendOtpEmail;