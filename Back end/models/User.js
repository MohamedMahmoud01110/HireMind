const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String, // student / company
  jobRole: String,
  bio: String,
  skills: [String],
  cv: String,
  scores: [
    {
      title: String,
      score: Number,
    },
  ],
  plan: {
    type: String,
    enum: ["free", "student_first", "student_return", "company_monthly", "single", "premium"],
    default: "free",
  },
  planExpiresAt: Date,
  subscriptionCount: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("User", userSchema);
