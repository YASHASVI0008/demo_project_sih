// backend.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import twilio from "twilio";

// --- Twilio Setup ---
const accountSid = "AC9c994e370f9f08765c8a945ebbb775b5";
const authToken = "000b1d8159f5bce8aa769f8afddcdbf5";
const client = twilio(accountSid, authToken);

function sendWhatsAppAlert(message) {
  client.messages
    .create({
      from: "whatsapp:+14155238886", // Twilio sandbox number
      to: "whatsapp:+919752313584",  // your WhatsApp
      body: message,
    })
    .then((msg) => console.log("✅ WhatsApp alert sent:", msg.sid))
    .catch((err) => console.error("❌ Twilio error:", err));
}

// --- Express Setup ---
const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(".")); // so threat.html can be opened directly

// --- Endpoint to receive alerts from frontend ---
app.post("/alert", (req, res) => {
  const { label } = req.body;
  console.log("⚠ ALERT RECEIVED from frontend:", req.body);

  if (label === "knife") {
    console.log("📲 Sending WhatsApp alert for:", label);
    sendWhatsAppAlert("🚨 Danger detected: Knife!");
  }

  res.sendStatus(200);
});

// --- Start server ---
const PORT = 3000;
server.listen(PORT, () => {
  console.log(🚀 Backend running on http://localhost:${PORT});
});
