const mongoose = require("mongoose");

const preAssessmentQuestionSchema = new mongoose.Schema({
  preAssessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "PreAssessment", required: true },
  text: String,
  options: [String],
  correctAnswer: String,
  marks: { type: Number, default: 1 },
  skill: { type: String, default: "" },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
  aiGenerated: { type: Boolean, default: false }
});

module.exports = mongoose.model("PreAssessmentQuestion", preAssessmentQuestionSchema);
