const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { createJob, getJobs, searchJobs, updateJob, deleteJob } = require("../controllers/jobController");

router.post("/create", auth(["company"]), createJob);
router.get("/all", auth(["student","company"]), getJobs);
router.get("/search", auth(), searchJobs);
router.put("/:id", auth(["company"]), updateJob);
router.delete("/:id", auth(["company"]), deleteJob);

module.exports = router;