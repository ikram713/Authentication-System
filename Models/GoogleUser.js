const mongoose = require("mongoose");

const googleUserSchema = new mongoose.Schema({
  googleId: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  name: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const GoogleUser = mongoose.model("GoogleUser", googleUserSchema);
module.exports = GoogleUser;