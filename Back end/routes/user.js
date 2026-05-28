const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  getProfile,
  updateProfile,
  getAllUsers,
  deleteUser,
  deleteUserById,
  changePassword,
  deleteMe,
  getJobRole,
  deleteAllUsers,
} = require("../controllers/userController");

router.get("/me", auth(), getProfile);
router.put("/me", auth(), updateProfile);
router.get("/me/job-role", auth(), getJobRole);
router.delete("/me", auth(), deleteMe);
router.put("/me/change-password", auth(), changePassword);
router.get("/", auth(["admin"]), getAllUsers);
router.delete("/", auth(["admin"]), deleteAllUsers);
router.delete("/:id", auth(["admin"]), deleteUserById);
module.exports = router;
