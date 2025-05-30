const mongoose = require("mongoose");

const localUserSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Add fullname
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const LocalUser = mongoose.model("LocalUser", localUserSchema);
module.exports = LocalUser;