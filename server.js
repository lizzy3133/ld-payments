import express from "express";
import Stripe from "stripe";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json({ limit: "50mb" }));

let ldState = {
  customBuilds: [],
  privateTickets: [],
  customerAccounts: [],
  employeeAccounts: [],
  bannedEmails: [],
  supportMessages: [],
  adminStats: { activeClients: 24, activeBuilds: 8 },
  updatedAt: Date.now()
};

app.get("/", (req, res) => {
  res.send("LD realtime server running");
});

app.get("/ld-state", (req, res) => {
  res.json(ldState);
});

app.post("/ld-state", (req, res) => {
  const { state } = req.body;

  if (state) {
    ldState = {
      ...ldState,
      ...state,
      updatedAt: Date.now()
    };

    io.emit("ld-state-update", {
      reason: req.body.reason || "update",
      state: ldState
    });
  }

  res.json({ success: true, state: ldState });
});

io.on("connection", (socket) => {
  console.log("PC connected:", socket.id);

  socket.emit("ld-current-state", ldState);

  socket.on("ld-state-update", (data) => {
    if (data && data.state) {
      ldState = {
        ...ldState,
        ...data.state,
        updatedAt: Date.now()
      };

      io.emit("ld-state-update", {
        reason: data.reason || "socket-update",
        state: ldState
      });
    }
  });
});

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
      success_url: "https://endearing-marigold-20ecd2.netlify.app",
      cancel_url: "https://endearing-marigold-20ecd2.netlify.app"
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe error:", error.message);
    res.status(500).json({ error: "Checkout failed" });
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`LD realtime server running on ${PORT}`);
});
