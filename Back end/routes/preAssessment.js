const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const PreAssessment = require("../models/PreAssessment");
const PreAssessmentQuestion = require("../models/PreAssessmentQuestion");

// Get pre-assessment by assessment ID
router.get("/assessment/:assessmentId", auth(), async (req, res) => {
  try {
    const preAssessment = await PreAssessment.findOne({ assessmentId: req.params.assessmentId });
    if (!preAssessment) return res.status(404).json({ error: "Pre-Assessment not found" });
    res.json(preAssessment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get MCQ questions for pre-assessment
router.get("/:preAssessmentId/questions", auth(), async (req, res) => {
  try {
    const questions = await PreAssessmentQuestion.find({ preAssessmentId: req.params.preAssessmentId });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
