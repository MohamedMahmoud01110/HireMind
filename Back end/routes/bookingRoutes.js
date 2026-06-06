const express = require("express");
const bookingController = require("../controllers/bookingController");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.use(auth());

router.get("/plans", bookingController.getAvailablePlans);
router.post("/checkout-session", bookingController.createCheckoutSession);
router.get("/session/:sessionId/confirm", bookingController.confirmSession);
router.get("/me", bookingController.getMyBookings);

module.exports = router;
