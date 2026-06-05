const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Booking = require("../models/BookingModel");
const User = require("../models/User");
const { getPlan } = require("../config/plans");

const clientUrl = () =>
  process.env.CLIENT_URL || "http://localhost:5173";

async function fulfillCheckoutSession(session) {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  const plan = getPlan(planId);

  if (!userId || !plan) return null;

  let booking = await Booking.findOneAndUpdate(
    { stripeSessionId: session.id },
    {
      paid: true,
      status: "completed",
      paidAt: new Date(),
    },
    { new: true },
  );

  if (!booking) {
    booking = await Booking.create({
      user: userId,
      plan: planId,
      price: plan.amount / 100,
      currency: plan.currency,
      stripeSessionId: session.id,
      paid: true,
      status: "completed",
      paidAt: new Date(),
    });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + plan.validityDays);

  await User.findByIdAndUpdate(userId, {
    plan: planId,
    planExpiresAt: expiresAt,
  });

  return { booking, planId, planName: plan.name };
}

exports.createCheckoutSession = async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        message: "Stripe is not configured. Set STRIPE_SECRET_KEY in the backend .env file.",
      });
    }

    const { planId } = req.body;
    const plan = getPlan(planId);

    if (!plan) {
      return res.status(400).json({ message: "Invalid plan selected." });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            unit_amount: plan.amount,
            product_data: {
              name: plan.name,
              description: `HireMind — ${plan.name}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: String(req.user.id),
        planId: plan.id,
      },
      client_reference_id: String(req.user.id),
      success_url: `${clientUrl()}/payment?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl()}/payment?canceled=true`,
    });

    await Booking.create({
      user: req.user.id,
      plan: plan.id,
      price: plan.amount / 100,
      currency: plan.currency,
      stripeSessionId: session.id,
      paid: false,
      status: "pending",
    });

    res.status(200).json({
      status: "success",
      sessionId: session.id,
      url: session.url,
    });
  } catch (err) {
    console.error("[Stripe checkout]", err);
    res.status(500).json({
      message: err.message || "Could not start checkout. Please try again.",
    });
  }
};

exports.confirmSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.userId !== String(req.user.id)) {
      return res.status(403).json({ message: "This payment session does not belong to you." });
    }

    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment is not completed yet." });
    }

    const result = await fulfillCheckoutSession(session);

    res.status(200).json({
      status: "success",
      plan: result?.planId,
      planName: result?.planName,
    });
  } catch (err) {
    console.error("[Stripe confirm]", err);
    res.status(500).json({
      message: err.message || "Could not confirm payment.",
    });
  }
};

exports.stripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).send("Webhook secret not configured");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("[Stripe webhook] signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      await fulfillCheckoutSession(event.data.object);
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("[Stripe webhook] handler error:", err);
    res.status(500).json({ message: "Webhook handler failed" });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .select("-__v");

    res.status(200).json({ status: "success", data: bookings });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not load bookings." });
  }
};
