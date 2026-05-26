const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { createAssessment, getAssessments, getAssessmentById } = require("../controllers/assessmentController");

router.post("/", auth(["company"]), createAssessment);
router.get("/", auth(), getAssessments);
router.get("/:id", auth(), getAssessmentById);

module.exports = router;
