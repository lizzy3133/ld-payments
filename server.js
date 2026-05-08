import express from "express";
import Stripe from "stripe";
import cors from "cors";

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { service, amount } = req.body;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: service || "LD Service" },
          unit_amount: amount || 3000
        },
        quantity: 1
      }],
      success_url: "https://your-website-link.com/success",
      cancel_url: "https://your-website-link.com/cancel"
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: "Checkout failed" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("LD payment server running");
});
