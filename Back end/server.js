const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/db");
const {
  generalLimiter,
  authLimiter,
  aiLimiter,
} = require("./middleware/rateLimitMiddleware");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");

dotenv.config();
connectDB();

const app = express();

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "10kb" }));
// app.use(mongoSanitize());

// Routes
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/jobs", require("./routes/job"));
app.use("/api/applications", require("./routes/application"));
app.use("/api/users", require("./routes/user"));
app.use("/api/assessments", require("./routes/assessment"));
app.use("/api/questions", require("./routes/question"));
app.use("/api/answers", require("./routes/candidateAnswer"));
app.use("/api/results", require("./routes/result"));
app.use("/api/pre-assessments", require("./routes/preAssessment"));
app.use("/api/ai", aiLimiter, require("./routes/ai"));

app.get("/", (req, res) => res.send("API Running 🚀"));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🔥`));
