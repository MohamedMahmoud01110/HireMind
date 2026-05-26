# HireMind2 – AI Question Generation Feature

## ما اللي اتعمل؟

تم إضافة ميزة **توليد الأسئلة تلقائياً بالـ AI** باستخدام Claude (Anthropic).
الشركة بدل ما تكتب الأسئلة بيدها، بتحدد:
- **عنوان الوظيفة**
- **وصف الوظيفة** (اختياري بس مهم)
- **Scorecard**: قائمة المهارات المطلوبة + تقييم النجوم (1-5 نجوم) لكل مهارة
- **عدد الأسئلة** اللي عايزها

والـ AI يولد أسئلة MCQ موزعة على المهارات حسب أهميتها.

---

## التعديلات على الكود

### 1. `models/Assessment.js` (معدّل)
أضفنا:
- `jobDescription` – وصف الوظيفة للـ AI
- `scorecard` – مصفوفة من `{ skill, stars }` لتحديد المهارات المطلوبة وأهميتها
- `numQuestions` – عدد الأسئلة المطلوبة من الـ AI
- `aiGenerated` – علامة هل الأسئلة تم توليدها بالـ AI

### 2. `models/Question.js` (معدّل)
أضفنا:
- `skill` – إيه المهارة اللي السؤال بيقيسها
- `difficulty` – `easy / medium / hard`
- `aiGenerated` – علامة إن السؤال ده من الـ AI

### 3. `controllers/aiQuestionController.js` (جديد)
فيه Endpoint اتنين:
- `generateQuestions` – يولد أسئلة لـ Assessment موجود
- `createAndGenerate` – يعمل Assessment جديد ويولد الأسئلة في خطوة واحدة ✅

### 4. `routes/ai.js` (جديد)
- `POST /api/ai/generate-questions`
- `POST /api/ai/create-and-generate`

### 5. `server.js` (معدّل)
تم إضافة: `app.use("/api/ai", require("./routes/ai"));`

### 6. `.env` (معدّل)
تم إضافة: `ANTHROPIC_API_KEY=your_key_here`

---

## إزاي تشغله

### الخطوة 1: احصل على Anthropic API Key
اروح على: https://console.anthropic.com
- سجل أو سجل دخول
- اعمل API Key جديد
- الصقه في `.env` بدل `your_anthropic_api_key_here`

### الخطوة 2: شغل الـ Server
```bash
npm install
npm start
# أو
nodemon server.js
```

---

## استخدام الـ API

### الطريقة الأسهل: إنشاء Assessment + توليد الأسئلة في خطوة واحدة

```
POST /api/ai/create-and-generate
Authorization: Bearer <company_token>
Content-Type: application/json

{
  "title": "Frontend Developer",
  "jobDescription": "We need a React developer with experience in TypeScript and REST APIs",
  "numQuestions": 10,
  "scorecard": [
    { "skill": "React", "stars": 5 },
    { "skill": "TypeScript", "stars": 4 },
    { "skill": "CSS", "stars": 3 },
    { "skill": "Problem Solving", "stars": 4 }
  ]
}
```

الرد:
```json
{
  "message": "Assessment created and 10 questions generated",
  "assessment": { ... },
  "questions": [
    {
      "text": "Which React hook is used to manage side effects?",
      "options": ["useState", "useEffect", "useContext", "useReducer"],
      "correctAnswer": "useEffect",
      "marks": 1,
      "skill": "React",
      "difficulty": "easy",
      "aiGenerated": true
    },
    ...
  ]
}
```

### أو: ولّد أسئلة لـ Assessment موجود

```
POST /api/ai/generate-questions
Authorization: Bearer <company_token>
Content-Type: application/json

{
  "assessmentId": "6621abc123def456"
}
```

---

## التأكد إن كل شيء شغال

### 1. اختبر الـ Server شغال
```bash
curl http://localhost:5000/
# المفروض ترد: API Running 🚀
```

### 2. سجل دخول كشركة واحصل على token
```
POST /api/auth/login
{ "email": "company@test.com", "password": "123456" }
```

### 3. اعمل Assessment + أسئلة
```
POST /api/ai/create-and-generate
Authorization: Bearer <token>
{ "title": "Backend Developer", "numQuestions": 5, "scorecard": [{"skill":"Node.js","stars":5}] }
```

### 4. تحقق إن الأسئلة اتحفظت في MongoDB
```bash
# في MongoDB shell أو Compass
db.questions.find({ aiGenerated: true })
```

---

## ملاحظات مهمة على الـ Database

**مش محتاجة تحطي أسئلة بيدك خالص!**

- الـ `questions` collection هتتملى أوتوماتيك من الـ AI
- لو اتعملت أسئلة AI لـ Assessment معين وعملتيها تاني، الأسئلة القديمة بتتمسح وبتتولد جديدة
- الأسئلة اللي اتضافت يدوياً (بيد) مش بتتأثر (هي بتبقى `aiGenerated: false`)
- الـ `scorecard` و `numQuestions` بيتحفظوا في الـ `assessments` collection

### Schema الجديد في MongoDB:

**assessments collection:**
```json
{
  "_id": "...",
  "title": "Frontend Developer",
  "companyId": "...",
  "jobDescription": "...",
  "scorecard": [
    { "skill": "React", "stars": 5 },
    { "skill": "CSS", "stars": 3 }
  ],
  "numQuestions": 10,
  "aiGenerated": true,
  "createdAt": "..."
}
```

**questions collection:**
```json
{
  "_id": "...",
  "assessmentId": "...",
  "text": "What is JSX in React?",
  "options": ["A syntax extension", "A framework", "A library", "A database"],
  "correctAnswer": "A syntax extension",
  "marks": 1,
  "skill": "React",
  "difficulty": "easy",
  "aiGenerated": true
}
```
