const CandidateAnswer = require("../models/CandidateAnswer");

// Submit Answer
exports.submitAnswer = async (req, res) => {
  try {
    const answer = new CandidateAnswer({
      ...req.body,
      studentId: req.user.id
    });
    await answer.save();
    res.status(201).json(answer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get My Answers
exports.getMyAnswers = async (req, res) => {
  try {
    const answers = await CandidateAnswer.find({ studentId: req.user.id });
    res.json(answers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};