const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment" },
  text: String,
  type: { type: String, enum: ["mcq", "essay"], default: "mcq" },

  // MCQ only
  options: [String],
  correctAnswer: String,

  // Essay only
  expectedKeywords: [String],  // AI checks if candidate's answer contains these keywords
  modelAnswer: { type: String, default: "" },

  marks: { type: Number, default: 1 },
  skill: { type: String, default: "" },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
  aiGenerated: { type: Boolean, default: false }
});

module.exports = mongoose.model("Question", questionSchema);
