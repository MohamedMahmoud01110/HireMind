const Job = require("../models/Job");

// Create Job
exports.createJob = async (req, res) => {
  try {
    const { title, description, category, location } = req.body;
    const job = new Job({ title, description, category, location, companyId: req.user.id });
    await job.save();
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all jobs with pagination
exports.getJobs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const jobs = await Job.find().skip((page - 1) * limit).limit(limit);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Search Jobs
exports.searchJobs = async (req, res) => {
  try {
    const { keyword, location, category } = req.query;
    let query = {};
    if (keyword) query.title = { $regex: keyword, $options: "i" };
    if (location) query.location = location;
    if (category) query.category = category;

    const jobs = await Job.find(query);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Job
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.companyId.toString() !== req.user.id) return res.status(403).json({ message: "Not authorized" });

    const updated = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Job
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.companyId.toString() !== req.user.id) return res.status(403).json({ message: "Not authorized" });

    await job.deleteOne();
    res.json({ message: "Job deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};