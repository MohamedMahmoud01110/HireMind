require("dotenv").config();
const { MongoClient } = require("mongodb");

async function createViews() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db("hiremind_db");
  console.log("✅ Connected to MongoDB");

  const existingViews = await db.listCollections().toArray();
  const viewNames = existingViews.map(v => v.name);

  async function dropIfExists(name) {
    if (viewNames.includes(name)) {
      await db.dropCollection(name);
      console.log(`🗑️  Dropped existing view: ${name}`);
    }
  }

  // ============================================
  // 1. assessment_with_questions
  // كل assessment مع أسئلة الـ essay بتاعته
  // ============================================
  await dropIfExists("assessment_with_questions");
  await db.createCollection("assessment_with_questions", {
    viewOn: "assessments",
    pipeline: [
      {
        $lookup: {
          from: "questions",
          localField: "_id",
          foreignField: "assessmentId",
          as: "questions"
        }
      },
      {
        $project: {
          title: 1,
          jobDescription: 1,
          scorecard: 1,
          numQuestions: 1,
          aiGenerated: 1,
          createdAt: 1,
          totalQuestions: { $size: "$questions" },
          questions: 1
        }
      }
    ]
  });
  console.log("✅ View created: assessment_with_questions");

  // ============================================
  // 2. pre_assessment_with_questions
  // كل pre-assessment مع أسئلة الـ MCQ بتاعته
  // ============================================
  await dropIfExists("pre_assessment_with_questions");
  await db.createCollection("pre_assessment_with_questions", {
    viewOn: "preassessments",
    pipeline: [
      {
        $lookup: {
          from: "preassessmentquestions",
          localField: "_id",
          foreignField: "preAssessmentId",
          as: "questions"
        }
      },
      {
        $project: {
          title: 1,
          assessmentId: 1,
          numQuestions: 1,
          aiGenerated: 1,
          createdAt: 1,
          totalQuestions: { $size: "$questions" },
          questions: 1
        }
      }
    ]
  });
  console.log("✅ View created: pre_assessment_with_questions");

  // ============================================
  // 3. full_assessment_view
  // assessment + pre-assessment + كل الأسئلة مع بعض
  // ============================================
  await dropIfExists("full_assessment_view");
  await db.createCollection("full_assessment_view", {
    viewOn: "assessments",
    pipeline: [
      {
        $lookup: {
          from: "questions",
          localField: "_id",
          foreignField: "assessmentId",
          as: "essayQuestions"
        }
      },
      {
        $lookup: {
          from: "preassessments",
          localField: "_id",
          foreignField: "assessmentId",
          as: "preAssessment"
        }
      },
      {
        $unwind: { path: "$preAssessment", preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: "preassessmentquestions",
          localField: "preAssessment._id",
          foreignField: "preAssessmentId",
          as: "mcqQuestions"
        }
      },
      {
        $project: {
          title: 1,
          jobDescription: 1,
          scorecard: 1,
          createdAt: 1,
          totalEssayQuestions: { $size: "$essayQuestions" },
          totalMCQQuestions: { $size: "$mcqQuestions" },
          essayQuestions: 1,
          mcqQuestions: 1
        }
      }
    ]
  });
  console.log("✅ View created: full_assessment_view");

  // ============================================
  // 4. job_with_applications
  // كل وظيفة مع عدد المتقدمين ليها
  // ============================================
  await dropIfExists("job_with_applications");
  await db.createCollection("job_with_applications", {
    viewOn: "jobs",
    pipeline: [
      {
        $lookup: {
          from: "applications",
          localField: "_id",
          foreignField: "jobId",
          as: "applications"
        }
      },
      {
        $project: {
          title: 1,
          description: 1,
          createdAt: 1,
          totalApplicants: { $size: "$applications" },
          applications: 1
        }
      }
    ]
  });
  console.log("✅ View created: job_with_applications");

  // ============================================
  // 5. candidate_results_view
  // نتايج الـ candidates مع اسمهم والوظيفة
  // ============================================
  await dropIfExists("candidate_results_view");
  await db.createCollection("candidate_results_view", {
    viewOn: "results",
    pipeline: [
      {
        $lookup: {
          from: "users",
          localField: "candidateId",
          foreignField: "_id",
          as: "candidate"
        }
      },
      {
        $unwind: { path: "$candidate", preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: "assessments",
          localField: "assessmentId",
          foreignField: "_id",
          as: "assessment"
        }
      },
      {
        $unwind: { path: "$assessment", preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          candidateName: "$candidate.name",
          candidateEmail: "$candidate.email",
          assessmentTitle: "$assessment.title",
          score: 1,
          totalMarks: 1,
          percentage: {
            $multiply: [{ $divide: ["$score", "$totalMarks"] }, 100]
          },
          createdAt: 1
        }
      }
    ]
  });
  console.log("✅ View created: candidate_results_view");

  // ============================================
  // 6. company_assessments_view
  // كل شركة مع الـ assessments اللي عملتها
  // ============================================
  await dropIfExists("company_assessments_view");
  await db.createCollection("company_assessments_view", {
    viewOn: "users",
    pipeline: [
      {
        $match: { role: "company" }
      },
      {
        $lookup: {
          from: "assessments",
          localField: "_id",
          foreignField: "companyId",
          as: "assessments"
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          totalAssessments: { $size: "$assessments" },
          assessments: 1
        }
      }
    ]
  });
  console.log("✅ View created: company_assessments_view");

  console.log("\n=============================");
  console.log("✅ All 6 views created successfully!");
  console.log("=============================");
  console.log("\nViews in your database:");
  console.log("1. assessment_with_questions");
  console.log("2. pre_assessment_with_questions");
  console.log("3. full_assessment_view");
  console.log("4. job_with_applications");
  console.log("5. candidate_results_view");
  console.log("6. company_assessments_view");

  await client.close();
}

createViews().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
