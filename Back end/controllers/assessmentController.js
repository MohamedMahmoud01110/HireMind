const Assessment = require("../models/Assessment");

exports.createAssessment = async (req, res) => {
  try {
    const newAssessment = new Assessment({ ...req.body, companyId: req.user.id });
    await newAssessment.save();
    res.status(201).json(newAssessment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAssessments = async (req, res) => {
  try {
    const assessments = await Assessment.find();
    res.json(assessments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAssessmentById = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: "Assessment not found" });
    res.json(assessment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
