const mongoose = require("mongoose");

const candidateAnswerSchema = new mongoose.Schema({
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment" },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
  answer: String
});

module.exports = mongoose.model("CandidateAnswer", candidateAnswerSchema);