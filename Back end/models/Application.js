const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, default: "pending" }, // pending / accepted / rejected
  appliedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Application", applicationSchema);