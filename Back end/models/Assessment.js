const mongoose = require("mongoose");

// Scorecard: defines what skills/criteria the assessment should evaluate
// Each criterion has a name and a star rating (1-5) for importance
const scorecardItemSchema = new mongoose.Schema({
  skill: { type: String, required: true },        // e.g. "React", "Problem Solving"
  stars: { type: Number, min: 1, max: 5, default: 3 } // importance level (weight)
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  jobDescription: { type: String, default: "" },  // AI uses this to generate relevant questions
  scorecard: [scorecardItemSchema],                // AI uses this to focus & weight questions
  numQuestions: { type: Number, default: 5 },      // how many questions AI should generate
  aiGenerated: { type: Boolean, default: false },  // flag: were questions auto-generated?
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Assessment", assessmentSchema);
