const User = require("../models/User");
const PreAssessmentResult = require("../models/PreAssessmentResult");
const bcrypt = require("bcryptjs");

// Get profile
exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
};

// Update profile
// exports.updateProfile = async (req, res) => {
//   const { score, ...rest } = req.body;

//   const updateQuery = { ...rest };

//   if (score) {
//     updateQuery.$push = {
//       scores: score,
//     };
//   }

//   const user = await User.findByIdAndUpdate(req.user.id, updateQuery, {
//     new: true,
//   }).select("-password");

//   res.json(user);
// };

// exports.updateProfile = async (req, res) => {
//   const { score, ...rest } = req.body;

//   const update = {};

//   if (Object.keys(rest).length) {
//     update.$set = rest;
//   }

//   if (score) {
//     update.$push = {
//       scores: score,
//     };
//   }

//   const user = await User.findByIdAndUpdate(req.user.id, update, {
//     new: true,
//   }).select("-password");

//   res.json(user);
// };
exports.updateProfile = async (req, res) => {
  const { score, ...rest } = req.body;
  const user = await User.findById(req.user.id);

  if (score) {
    const index = user.scores.findIndex((s) => s.title === score.title);

    if (index !== -1) {
      user.scores[index].score = score.score;
    } else {
      user.scores.push(score);
    }
  }

  Object.assign(user, rest);

  await user.save();

  const updated = await User.findById(req.user.id).select("-password");
  res.status(200).json(updated);
};

// get my job role
exports.getJobRole = async (req, res) => {
  const user = await User.findById(req.user.id).select("jobRole");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json({ jobRole: user.jobRole });
};

//delete me
exports.deleteMe = async (req, res) => {
  await User.findByIdAndDelete(req.user.id).select("-password");
  res.json({
    message: "User deleted successfully",
  });
};
// change password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // check fields
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // check confirm password
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    // get user with password
    const user = await User.findById(req.user.id);

    // compare old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Old password is incorrect",
      });
    }

    // hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // save new password
    user.password = hashedPassword;

    await user.save();

    res.json({
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
// get all users only for admin account (includes latest pre-assessment score)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").lean();

    const studentIds = users
      .filter((u) => u.role === "student")
      .map((u) => u._id);

    const results = await PreAssessmentResult.find({
      studentId: { $in: studentIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    const scoreByStudent = {};
    for (const result of results) {
      const id = result.studentId.toString();
      if (!scoreByStudent[id]) {
        scoreByStudent[id] = {
          score: result.score,
          total: result.total,
          percentage: result.percentage,
          completedAt: result.createdAt,
        };
      }
    }

    const usersWithScores = users.map((user) => ({
      ...user,
      preAssessment: scoreByStudent[user._id.toString()] || null,
    }));

    res.json({
      success: true,
      total: usersWithScores.length,
      users: usersWithScores,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteUserById = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.deleteAllUsers = async (req, res) => {
  try {
    await User.deleteMany({ role: { $ne: "admin" } }); // delete all users except admin

    res.json({
      success: true,
      message: "All users deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
