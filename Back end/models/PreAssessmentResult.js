const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  preAssessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "PreAssessment" },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
 score: Number,
  total: Number,
  percentage: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("PreAssessmentResult", resultSchema);
