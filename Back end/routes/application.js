const express = require("express");
const router = express.Router();
const {
  applyJob,
  getMyApplications,
  getApplicantsForJob
} = require("../controllers/applicationController");

const auth = require("../middleware/authMiddleware");

// ✅ Apply for a job (student only)
router.post("/apply", auth(["student"]), applyJob);

// ✅ Get my applications (student only)
router.get("/my-applications", auth(["student"]), getMyApplications);

// ✅ Get applicants for a job (company only)
router.get("/:jobId", auth(["company"]), getApplicantsForJob);


module.exports = router;