const mongoose = require("mongoose");

const GitHubUserSchema = new mongoose.Schema({
  githubId: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  name: { type: String },
});

module.exports = mongoose.model("GitHubUser", GitHubUserSchema);
