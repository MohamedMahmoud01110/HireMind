const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { calculateResult, getStudentResults, getAssessmentResults } = require("../controllers/resultController");

// Student
router.post("/calculate", auth(["student"]), calculateResult);
router.get("/student", auth(["student"]), getStudentResults);

// Company - get all results for an assessment
router.get("/assessment/:assessmentId", auth(["company"]), getAssessmentResults);

module.exports = router;
