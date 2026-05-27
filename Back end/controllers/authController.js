const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);
    const hashedPassword = await bcrypt.hash(password, 10);
    let user = await User.findOne({ email: email.trim().toLowerCase() });
    if (user) return res.status(400).json({ message: "User already exists" });
    user = new User({ name, email, password: hashedPassword, role });
    await user.save();
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    res.status(201).json({
      data: {
        message: "User created successfully",
        token,
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          jobRole: user.jobRole,
          bio: user.bio,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("BODY:", req.body);
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    console.log("USER FOUND:", user);

    if (!user) return res.status(400).json({ message: "User not found" });
    console.log("DB PASSWORD:", user.password);
    const isMatch = await bcrypt.compare(password, user.password);
    // console.log("MATCH:", isMatch);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      data: {
        token,
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          jobRole: user.jobRole,
          bio: user.bio,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
