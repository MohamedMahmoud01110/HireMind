// Global error handler - hides internal details from client
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.stack}`);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation failed",
      details: Object.values(err.errors).map(e => e.message)
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ error: `${field} already exists` });
  }

  // JWT error
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token" });
  }

  // Default - don't expose internal errors to client
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production"
      ? "Something went wrong"
      : err.message
  });
};

// 404 handler
const notFound = (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
};

module.exports = { errorHandler, notFound };
