const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Get profile
exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
};

// Update profile
exports.updateProfile = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user.id, req.body, {
    new: true,
  }).select("-password");
  res.json(user);
};

//delete me
exports.deleteMe = async (req, res) => {
  await User.deleteOne(req.user.id);
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
// get all users only for admin account
exports.getAllUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json({
    success: true,
    total: users.length,
    users,
  });
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
