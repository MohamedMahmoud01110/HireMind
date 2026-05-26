const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: String,
  category: String,
  location: String,
  datePosted: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Job", jobSchema);