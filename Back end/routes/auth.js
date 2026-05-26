const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");
const {
  validateRegister,
  validateLogin,
} = require("../middleware/validateMiddleware");
console.log("AUTH ROUTE LOADED");
// Register
router.post("/register", validateRegister, register);

// Login
router.post("/login", validateLogin, login);

module.exports = router;
