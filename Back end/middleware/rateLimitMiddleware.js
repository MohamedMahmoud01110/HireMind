const rateLimit = require("express-rate-limit");

// General API rate limit - 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth routes - 10 requests per 15 minutes (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false
});

// AI routes - 20 requests per hour
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: { error: "Too many AI requests, please try again after an hour" },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { generalLimiter, authLimiter, aiLimiter };
