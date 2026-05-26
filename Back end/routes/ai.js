const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  generateQuestions,
  createAndGenerate,
  createPreAssessment,
  gradeEssay
} = require("../controllers/aiQuestionController");

// Assessment (Essay questions)
router.post("/create-and-generate", auth(["company"]), createAndGenerate);
router.post("/generate-questions", auth(["company"]), generateQuestions);

// Pre-Assessment (MCQ questions)
router.post("/create-pre-assessment", auth(["company"]), createPreAssessment);

// Grade essay answer
router.post("/grade-essay", auth(), gradeEssay);

module.exports = router;
