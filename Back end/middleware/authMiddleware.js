const jwt = require("jsonwebtoken");

const auth = (roles = []) => {
  return (req, res, next) => {
    try {
      const token =
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer ")
          ? req.headers.authorization.split(" ")[1]
          : null;

      if (!token) return res.status(401).json({ message: "No token provided" });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = {
        id: decoded.id || decoded._id,
        role: decoded.role,
      };

      if (roles.length > 0 && !roles.includes(req.user.role)) {
        return res
          .status(403)
          .json({ message: "Access denied - insufficient permissions" });
      }

      next();
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Token expired, please login again" });
      }

      return res.status(401).json({ message: "Invalid token" });
    }
  };
};

module.exports = auth;
