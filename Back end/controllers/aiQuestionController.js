const Assessment = require("../models/Assessment");
const Question = require("../models/Question");
const PreAssessment = require("../models/PreAssessment");
const PreAssessmentQuestion = require("../models/PreAssessmentQuestion");

// =====================
// Helper: Call OpenRouter AI
// =====================
async function callAI(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set in .env");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "google/gemma-3-4b-it:free",
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// =====================
// Helper: Build MCQ prompt (for Pre-Assessment)
// =====================
function buildMCQPrompt(title, jobDescription, scorecard, numQuestions) {
  const scorecardText = scorecard && scorecard.length > 0
    ? scorecard.map(item => `  - ${item.skill} (importance: ${item.stars}/5)`).join("\n")
    : "  - General knowledge relevant to the job";

  return `You are an expert technical recruiter. Generate exactly ${numQuestions} multiple-choice questions for a quick pre-screening assessment.
Job Title: ${title}
Job Description: ${jobDescription || "Not provided"}
Scorecard:
${scorecardText}

Rules:
- Questions should be quick and straightforward for initial screening
- Each question must have exactly 4 options
- Only one correct answer

Respond ONLY with a valid JSON array, no markdown, no explanation:
[{"text":"...","options":["A","B","C","D"],"correctAnswer":"A","marks":1,"skill":"...","difficulty":"easy"}]`;
}

// =====================
// Helper: Build Essay prompt (for Assessment)
// =====================
function buildEssayPrompt(title, jobDescription, scorecard, numQuestions) {
  const scorecardText = scorecard && scorecard.length > 0
    ? scorecard.map(item => `  - ${item.skill} (importance: ${item.stars}/5)`).join("\n")
    : "  - General knowledge relevant to the job";

  return `You are an expert technical recruiter. Generate exactly ${numQuestions} essay questions for a deep technical assessment.
Job Title: ${title}
Job Description: ${jobDescription || "Not provided"}
Scorecard:
${scorecardText}

Rules:
- Questions should require detailed written answers
- Each question must have 5-8 expected keywords that a good answer should contain
- Distribute questions across scorecard skills by star rating

Respond ONLY with a valid JSON array, no markdown, no explanation:
[{"text":"...","expectedKeywords":["keyword1","keyword2","keyword3"],"marks":10,"skill":"...","difficulty":"medium"}]`;
}

// =====================
// POST /api/ai/create-and-generate
// Creates Assessment + generates Essay questions
// =====================
exports.createAndGenerate = async (req, res) => {
  try {
    const { title, jobDescription, scorecard, numQuestions } = req.body;

    // 1. Generate essay questions first
    const prompt = buildEssayPrompt(title, jobDescription, scorecard, numQuestions || 5);
    const rawText = await callAI(prompt);

    let questionsData;
    try {
      questionsData = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      return res.status(502).json({ error: "Failed to parse AI response", rawResponse: rawText });
    }

    // 2. Save assessment
    const assessment = new Assessment({
      title,
      jobDescription: jobDescription || "",
      scorecard: scorecard || [],
      numQuestions: numQuestions || 5,
      companyId: req.user.id,
      aiGenerated: true
    });
    await assessment.save();

    // 3. Save essay questions
    const savedQuestions = await Question.insertMany(
      questionsData.map(q => ({
        assessmentId: assessment._id,
        type: "essay",
        text: q.text,
        expectedKeywords: q.expectedKeywords || [],
        marks: q.marks || 10,
        skill: q.skill || "",
        difficulty: q.difficulty || "medium",
        aiGenerated: true
      }))
    );

    res.status(201).json({
      message: `Assessment created and ${savedQuestions.length} essay questions generated`,
      assessment,
      questions: savedQuestions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =====================
// POST /api/ai/generate-questions
// Generates Essay questions for existing Assessment
// =====================
exports.generateQuestions = async (req, res) => {
  try {
    const { assessmentId } = req.body;
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) return res.status(404).json({ error: "Assessment not found" });
    if (assessment.companyId.toString() !== req.user.id)
      return res.status(403).json({ error: "Not authorized" });

    const prompt = buildEssayPrompt(assessment.title, assessment.jobDescription, assessment.scorecard, assessment.numQuestions);
    const rawText = await callAI(prompt);

    let questionsData;
    try {
      questionsData = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      return res.status(502).json({ error: "Failed to parse AI response", rawResponse: rawText });
    }

    await Question.deleteMany({ assessmentId, aiGenerated: true });
    const savedQuestions = await Question.insertMany(
      questionsData.map(q => ({
        assessmentId,
        type: "essay",
        text: q.text,
        expectedKeywords: q.expectedKeywords || [],
        marks: q.marks || 10,
        skill: q.skill || "",
        difficulty: q.difficulty || "medium",
        aiGenerated: true
      }))
    );

    assessment.aiGenerated = true;
    await assessment.save();

    res.status(201).json({ message: `${savedQuestions.length} essay questions generated`, questions: savedQuestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =====================
// POST /api/ai/create-pre-assessment
// Creates PreAssessment + generates MCQ questions linked to an Assessment
// =====================
exports.createPreAssessment = async (req, res) => {
  try {
    const { assessmentId, numQuestions } = req.body;

    // Load the parent assessment to get job info + scorecard
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) return res.status(404).json({ error: "Assessment not found" });
    if (assessment.companyId.toString() !== req.user.id)
      return res.status(403).json({ error: "Not authorized" });

    // 1. Generate MCQ questions first
    const prompt = buildMCQPrompt(assessment.title, assessment.jobDescription, assessment.scorecard, numQuestions || 5);
    const rawText = await callAI(prompt);

    let questionsData;
    try {
      questionsData = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      return res.status(502).json({ error: "Failed to parse AI response", rawResponse: rawText });
    }

    // 2. Save PreAssessment
    const preAssessment = new PreAssessment({
      assessmentId: assessment._id,
      companyId: req.user.id,
      title: `Pre-Assessment: ${assessment.title}`,
      numQuestions: numQuestions || 5,
      aiGenerated: true
    });
    await preAssessment.save();

    // 3. Save MCQ questions
    const savedQuestions = await PreAssessmentQuestion.insertMany(
      questionsData.map(q => ({
        preAssessmentId: preAssessment._id,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: q.marks || 1,
        skill: q.skill || "",
        difficulty: q.difficulty || "medium",
        aiGenerated: true
      }))
    );

    res.status(201).json({
      message: `Pre-Assessment created and ${savedQuestions.length} MCQ questions generated`,
      preAssessment,
      questions: savedQuestions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =====================
// POST /api/ai/grade-essay
// AI grades a candidate's essay answer using expectedKeywords + scorecard
// =====================
exports.gradeEssay = async (req, res) => {
  try {
    const { questionId, candidateAnswer } = req.body;

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ error: "Question not found" });
    if (question.type !== "essay") return res.status(400).json({ error: "Question is not an essay type" });

    const keywords = question.expectedKeywords || [];
    const totalMarks = question.marks || 10;

    // Count matched keywords
    const lowerAnswer = candidateAnswer.toLowerCase();
    const matched = keywords.filter(k => lowerAnswer.includes(k.toLowerCase()));
    const keywordScore = keywords.length > 0
      ? Math.round((matched.length / keywords.length) * totalMarks)
      : 0;

    res.json({
      questionId,
      totalMarks,
      obtainedMarks: keywordScore,
      matchedKeywords: matched,
      missedKeywords: keywords.filter(k => !matched.includes(k)),
      feedback: `Matched ${matched.length} out of ${keywords.length} expected keywords`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
