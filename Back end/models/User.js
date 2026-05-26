const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String, // student / company
  jobRole: String,
  bio: String,
});

module.exports = mongoose.model("User", userSchema);
