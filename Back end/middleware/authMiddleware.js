const jwt = require("jsonwebtoken");

const auth = (roles = []) => {
  return (req, res, next) => {
    try {
      // const token = req.header("Authorization")?.replace("Bearer ", "");
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ message: "No token provided" });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      if (roles.length && !req.user?.role) {
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
      res.status(401).json({ message: "Invalid token" });
    }
  };
};

module.exports = auth;
