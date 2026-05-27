const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const PreAssessment = require("../models/PreAssessment");
const PreAssessmentQuestion = require("../models/PreAssessmentQuestion");
const PreAssessmentResult = require("../models/PreAssessmentResult");

// Get all pre-assessments
router.get("/", auth(), async (req, res) => {
  try {
    const preAssessment = await PreAssessment.find();
    if (!preAssessment.length)
      return res.status(404).json({ error: "Pre-Assessment not found" });
    res.json(preAssessment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
const normalizeTitle = (str) => {
  return str
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
// get pre assessment by title
router.get("/:title", auth(), async (req, res) => {
  try {
    const roleFromUrl = req.params.title;

    const normalized = normalizeTitle(roleFromUrl.replace(/-/g, " "));

    const preAssessment = await PreAssessment.findOne({
      title: { $regex: `Pre-Assessment: ${normalized}`, $options: "i" },
    });

    if (!preAssessment)
      return res.status(404).json({ error: "Pre-Assessment not found" });

    res.json(preAssessment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Get pre-assessment by assessment ID
router.get("/assessment/:assessmentId", auth(), async (req, res) => {
  try {
    const preAssessment = await PreAssessment.findOne({
      assessmentId: req.params.assessmentId,
    });
    if (!preAssessment)
      return res.status(404).json({ error: "Pre-Assessment not found" });
    res.json(preAssessment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get MCQ questions for pre-assessment
router.get("/:preAssessmentId/questions", auth(), async (req, res) => {
  try {
    const questions = await PreAssessmentQuestion.find({
      preAssessmentId: req.params.preAssessmentId,
    });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:preAssessmentId/submit", auth(), async (req, res) => {
  try {
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ error: "No user found" });
    }

    const { answers } = req.body;
    console.log(answers);
    const questionIds = Object.keys(answers);

    const questions = await PreAssessmentQuestion.find({
      preAssessmentId: req.params.preAssessmentId,
      _id: { $in: questionIds },
    });
    console.log(questions);
    if (!questions.length) {
      return res.status(400).json({ error: "No questions found" });
    }

    let score = 0;

    questions.forEach((q) => {
      const questionId = String(q._id);

      const userAnswer = answers?.[questionId]; // "B"
      const correctAnswer = q.correctAnswer; // "C"

      console.log("USER:", userAnswer);
      console.log("CORRECT:", correctAnswer);

      if (userAnswer === correctAnswer) {
        score++;
      }
    });
    const percentage = Math.round((score / questions.length) * 100);

    const existing = await PreAssessmentResult.findOne({
      preAssessmentId: req.params.preAssessmentId,
      studentId,
    });

    if (existing) {
      return res.status(400).json({
        error: "Assessment already submitted",
      });
    }

    const savedResult = await PreAssessmentResult.create({
      preAssessmentId: req.params.preAssessmentId,
      studentId,
      score,
      total: questions.length,
      percentage,
    });

    res.json(savedResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:preAssessmentId/result", auth(), async (req, res) => {
  try {
    const preAssessmentResult = await PreAssessmentResult.findOne({
      preAssessmentId: req.params.preAssessmentId,
      studentId: req.user.id,
    });
    if (!preAssessmentResult)
      return res.status(404).json({ error: "Pre-Assessment Result not found" });
    res.json(preAssessmentResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:preAssessmentId/result", auth(), async (req, res) => {
  try {
    const deletedResult = await PreAssessmentResult.findOneAndDelete({
      preAssessmentId: req.params.preAssessmentId,
      studentId: req.user.id,
    });

    if (!deletedResult) {
      return res.status(404).json({ error: "Pre-Assessment Result not found" });
    }

    res.json({
      message: "Pre-Assessment result deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
