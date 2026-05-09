import express from "express";
import Stripe from "stripe";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

let globalState = {
  builds: [],
  tickets: [],
  users: [],
  prices: []
};

io.on("connection", (socket) => {

  console.log("User connected");

  socket.emit("state-update", globalState);

  socket.on("push-state", (data) => {
    globalState = data;
    io.emit("state-update", globalState);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });

});

app.get("/", (req, res) => {
  res.send("LD realtime server running");
});

app.post("/create-checkout-session", async (req, res) => {

  try {

    const { service, amount } = req.body;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: service || "LD Service"
            },
            unit_amount: amount || 3000
          },
          quantity: 1
        }
      ],
      success_url: "https://your-site.netlify.app/success",
      cancel_url: "https://your-site.netlify.app/cancel"
    });

    res.json({ url: session.url });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Checkout failed"
    });

  }

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`LD realtime server running on ${PORT}`);
});
