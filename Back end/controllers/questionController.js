const Question = require("../models/Question");

// Add Question
exports.addQuestion = async (req, res) => {
  try {
    const newQuestion = new Question(req.body);
    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Questions by Assessment
exports.getQuestions = async (req, res) => {
  try {
    const questions = await Question.find({ assessmentId: req.params.assessmentId });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};