const Result = require("../models/Result");
const CandidateAnswer = require("../models/CandidateAnswer");
const Question = require("../models/Question");

// Calculate Result - supports both MCQ and Essay
exports.calculateResult = async (req, res) => {
  try {
    const { assessmentId } = req.body;
    const studentId = req.user.id;

    const answers = await CandidateAnswer.find({ assessmentId, studentId });
    let obtainedMarks = 0;
    let totalMarks = 0;

    for (let ans of answers) {
      const question = await Question.findById(ans.questionId);
      if (!question) continue;
      totalMarks += question.marks || 0;

      if (question.type === "essay") {
        // Grade by keywords
        const keywords = question.expectedKeywords || [];
        if (keywords.length > 0) {
          const lowerAnswer = (ans.answer || "").toLowerCase();
          const matched = keywords.filter(k => lowerAnswer.includes(k.toLowerCase()));
          obtainedMarks += Math.round((matched.length / keywords.length) * (question.marks || 10));
        }
      } else {
        // MCQ - exact match
        if (ans.answer === question.correctAnswer) {
          obtainedMarks += question.marks || 1;
        }
      }
    }

    let result = await Result.findOne({ assessmentId, studentId });
    if (result) {
      result.totalMarks = totalMarks;
      result.obtainedMarks = obtainedMarks;
      result.percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;
    } else {
      result = new Result({
        assessmentId,
        studentId,
        totalMarks,
        obtainedMarks,
        percentage: totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0
      });
    }

    await result.save();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get student results
exports.getStudentResults = async (req, res) => {
  try {
    const results = await Result.find({ studentId: req.user.id })
      .populate("assessmentId", "title");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get results for a specific assessment (company)
exports.getAssessmentResults = async (req, res) => {
  try {
    const results = await Result.find({ assessmentId: req.params.assessmentId })
      .populate("studentId", "name email");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
