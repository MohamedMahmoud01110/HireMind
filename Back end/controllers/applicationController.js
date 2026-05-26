const Application = require("../models/Application");

// ================================
// Apply for a job
// ================================
exports.applyJob = async (req, res) => {
  try {
    const { jobId } = req.body;

    // نتأكد إن الطالب ما قدمش قبل كده على نفس الوظيفة
    const existing = await Application.findOne({
      jobId,
      studentId: req.user.id
    });
    if (existing) 
      return res.status(400).json({ message: "You already applied for this job" });

    const application = new Application({
      jobId,
      studentId: req.user.id
    });

    await application.save();
    res.status(201).json({ message: "Application submitted", application });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================================
// Get all applications (for student)
// ================================
exports.getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ studentId: req.user.id })
      .populate("jobId", "title category location companyId")
      .populate("studentId", "name email");

    res.json(applications);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================================
// Get applicants for a job (for company)
// ================================
exports.getApplicantsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const applications = await Application.find({ jobId })
      .populate("studentId", "name email");

    res.json(applications);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};