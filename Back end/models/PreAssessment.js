const mongoose = require("mongoose");

const preAssessmentSchema = new mongoose.Schema({
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment", required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: { type: String, required: true },
  numQuestions: { type: Number, default: 5 },
  aiGenerated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("PreAssessment", preAssessmentSchema);
