const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment" },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  obtainedMarks: Number,
  totalMarks: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Result", resultSchema);