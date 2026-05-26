const { body, validationResult } = require("express-validator");

// Helper to return validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Register validation
const validateRegister = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required"),

  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("Password must contain at least one special character"),

  body("role")
    .isIn(["company", "student"])
    .withMessage("Role must be company or student"),

  validate
];

// Login validation
const validateLogin = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  validate
];

// Job validation
const validateJob = [
  body("title").trim().notEmpty().withMessage("Job title is required"),
  body("description").trim().notEmpty().withMessage("Job description is required"),
  validate
];

// Assessment validation
const validateAssessment = [
  body("title").trim().notEmpty().withMessage("Assessment title is required"),
  body("numQuestions").isInt({ min: 1, max: 100 }).withMessage("Number of questions must be between 1 and 100"),
  validate
];

module.exports = { validateRegister, validateLogin, validateJob, validateAssessment };
