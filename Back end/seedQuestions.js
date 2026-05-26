require("dotenv").config();
const mongoose = require("mongoose");
const Assessment = require("./models/Assessment");
const Question = require("./models/Question");
const PreAssessment = require("./models/PreAssessment");
const PreAssessmentQuestion = require("./models/PreAssessmentQuestion");
const jobs = require("./seedJobs.json");

const COMPANY_ID = "69cb07b2b2d42354a3107da9";

async function callAI(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI error: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function buildEssayPrompt(title, jobDescription, scorecard, batch) {
  const scorecardText = scorecard
    .map(item => `  - ${item.skill} (importance: ${item.stars}/5)`)
    .join("\n");

  return `You are an expert technical recruiter. Generate exactly 25 essay questions for a deep technical assessment. This is batch ${batch} of 2.
Job Title: ${title}
Job Description: ${jobDescription}
Scorecard:
${scorecardText}

Rules:
- Questions should require detailed written answers
- Each question must have 5-8 expected keywords
- Vary difficulty: 30% easy, 50% medium, 20% hard

Respond ONLY with a valid JSON array, no markdown, no explanation:
[{"text":"...","expectedKeywords":["keyword1","keyword2"],"marks":10,"skill":"...","difficulty":"medium"}]`;
}

function buildMCQPrompt(title, jobDescription, scorecard, batch) {
  const scorecardText = scorecard
    .map(item => `  - ${item.skill} (importance: ${item.stars}/5)`)
    .join("\n");

  return `You are an expert technical recruiter. Generate exactly 25 multiple-choice questions for pre-screening. This is batch ${batch} of 2.
Job Title: ${title}
Job Description: ${jobDescription}
Scorecard:
${scorecardText}

Rules:
- Each question must have exactly 4 options
- Only one correct answer
- Vary difficulty: 30% easy, 50% medium, 20% hard

Respond ONLY with a valid JSON array, no markdown, no explanation:
[{"text":"...","options":["A","B","C","D"],"correctAnswer":"A","marks":1,"skill":"...","difficulty":"easy"}]`;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseJSON(raw) {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  // find first [ and last ]
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array found");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // امسح الـ assessments الفاضية
  const allAssessments = await Assessment.find({ companyId: COMPANY_ID });
  for (const a of allAssessments) {
    const qCount = await Question.countDocuments({ assessmentId: a._id });
    if (qCount === 0) {
      await Assessment.deleteOne({ _id: a._id });
      console.log(`🗑️  Deleted empty assessment: ${a.title}`);
    }
  }

  const done = await Assessment.find({ companyId: COMPANY_ID }).distinct("title");
  const remaining = jobs.filter(j => !done.includes(j.title));
  console.log(`\n📋 Remaining: ${remaining.length} jobs | Already done: ${done.length} jobs\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < remaining.length; i++) {
    const job = remaining[i];
    console.log(`[${i + 1}/${remaining.length}] Processing: ${job.title}...`);

    try {
      // ESSAY: batch 1
      console.log(`   📝 Essay batch 1/2...`);
      const essay1Raw = await callAI(buildEssayPrompt(job.title, job.jobDescription, job.scorecard, 1));
      const essay1 = parseJSON(essay1Raw);
      await sleep(5000);

      // ESSAY: batch 2
      console.log(`   📝 Essay batch 2/2...`);
      const essay2Raw = await callAI(buildEssayPrompt(job.title, job.jobDescription, job.scorecard, 2));
      const essay2 = parseJSON(essay2Raw);
      const essayData = [...essay1, ...essay2];

      // Save Assessment + Essay Questions
      const assessment = new Assessment({
        title: job.title,
        jobDescription: job.jobDescription,
        scorecard: job.scorecard,
        numQuestions: 50,
        companyId: COMPANY_ID,
        aiGenerated: true
      });
      await assessment.save();

      await Question.insertMany(
        essayData.map(q => ({
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
      console.log(`   ✅ ${essayData.length} essay questions saved`);
      await sleep(8000);

      // MCQ: batch 1
      console.log(`   🔵 MCQ batch 1/2...`);
      const mcq1Raw = await callAI(buildMCQPrompt(job.title, job.jobDescription, job.scorecard, 1));
      const mcq1 = parseJSON(mcq1Raw);
      await sleep(5000);

      // MCQ: batch 2
      console.log(`   🔵 MCQ batch 2/2...`);
      const mcq2Raw = await callAI(buildMCQPrompt(job.title, job.jobDescription, job.scorecard, 2));
      const mcq2 = parseJSON(mcq2Raw);
      const mcqData = [...mcq1, ...mcq2];

      // Save PreAssessment + MCQ Questions
      const preAssessment = new PreAssessment({
        assessmentId: assessment._id,
        companyId: COMPANY_ID,
        title: `Pre-Assessment: ${job.title}`,
        numQuestions: 50,
        aiGenerated: true
      });
      await preAssessment.save();

      await PreAssessmentQuestion.insertMany(
        mcqData.map(q => ({
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
      console.log(`   ✅ ${mcqData.length} MCQ questions saved`);
      success++;

      if (i < remaining.length - 1) {
        console.log(`   ⏳ Waiting 10 seconds...`);
        await sleep(10000);
      }

    } catch (err) {
      console.error(`   ❌ Failed for "${job.title}": ${err.message}`);
      failed++;
      if (err.message.includes("429")) {
        console.log("   ⏳ Rate limited, waiting 60 seconds...");
        await sleep(60000);
      }
    }
  }

  console.log(`\n=============================`);
  console.log(`✅ Done! Success: ${success} | Failed: ${failed}`);
  console.log(`=============================`);
  mongoose.disconnect();
}

seed();
