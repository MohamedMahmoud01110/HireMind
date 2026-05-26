const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  addQuestion,
  getQuestionsByAssessmentId,
  getAllQuestions,
} = require("../controllers/questionController");

// إضافة سؤال (لـ company فقط)
router.post("/", auth(["company"]), addQuestion);

router.get("/", auth(["company"]), getAllQuestions);

// جلب أسئلة حسب assessmentId
router.get("/:assessmentId", auth(), getQuestionsByAssessmentId);

module.exports = router;
