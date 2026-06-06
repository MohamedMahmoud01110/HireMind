const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Booking must belong to a user"],
  },
  plan: {
    type: String,
    enum: ["student_first", "student_return", "company_monthly", "single", "premium"],
    required: [true, "Booking must have a plan"],
  },
  price: {
    type: Number,
    required: [true, "Booking must have a price"],
  },
  currency: {
    type: String,
    default: "egp",
  },
  stripeSessionId: {
    type: String,
    index: true,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "cancelled", "expired"],
    default: "pending",
  },
  paid: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  paidAt: Date,
});

const Booking = mongoose.model("Booking", schema);
module.exports = Booking;
