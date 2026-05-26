const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { addQuestion, getQuestions } = require("../controllers/questionController");

// إضافة سؤال (لـ company فقط)
router.post("/", auth(["company"]), addQuestion);

// جلب أسئلة حسب assessmentId
router.get("/:assessmentId", auth(), getQuestions);

module.exports = router;