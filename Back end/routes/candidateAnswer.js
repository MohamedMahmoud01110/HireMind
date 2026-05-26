const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { submitAnswer, getMyAnswers } = require("../controllers/candidateAnswerController");

// Submit answer
router.post("/", auth(["student"]), submitAnswer);

// Get my answers - must be before /:assessmentId
router.get("/me", auth(["student"]), getMyAnswers);

// Get answers by assessment
router.get("/:assessmentId", auth(["student"]), getMyAnswers);

module.exports = router;
