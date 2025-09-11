const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");
const twilio = require("twilio");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// Clarifai API
const CLARIFAI_API_KEY = "https://api.clarifai.com/v2/models/aaa03c23b3724a16a56b629203edc62c/outputs";
const MODEL_ID = "aaa03c23b3724a16a56b629203edc62c"; // General model

// Twilio API
const TWILIO_SID = "AC9c994e370f9f08765c8a945ebbb775b5";
const TWILIO_AUTH = "8c3eb91a42c62c570956147848992b02";
const TWILIO_PHONE = "+1234567890";
const TWILIO_WHATSAPP = "whatsapp:+1234567890";
const client = twilio(TWILIO_SID, TWILIO_AUTH);

app.use("/snapshots", express.static("snapshots"));

app.post("/analyze", async (req, res) => {
  try {
    const { imageBase64, phone, whatsapp } = req.body;
    let imageUrl = "";
    if (imageBase64 && imageBase64.length > 0) {
      // Save image locally (as PNG)
      const imageName = `snap_${Date.now()}.png`;
      const imagePath = `snapshots/${imageName}`;
      const imageBuffer = Buffer.from(imageBase64, "base64");
      fs.writeFileSync(imagePath, imageBuffer);
      imageUrl = `http://localhost:5000/snapshots/${imageName}`;
    }
    // ---- Clarifai Analysis ----
    let riskyObjects = [];
    if (imageBase64 && imageBase64.length > 0) {
      const response = await axios.post(
        `https://api.clarifai.com/v2/models/${MODEL_ID}/outputs`,
        { inputs: [{ data: { image: { base64: imageBase64 } } }] },
        { headers: { Authorization: `Key ${CLARIFAI_API_KEY}` } }
      );
      const concepts = response.data.outputs.data.concepts;
      const threats = ["knife", "gun", "rope", "scissors", "weapon"];
      riskyObjects = concepts.filter(
        c => threats.includes(c.name.toLowerCase()) && c.value > 0.85
      );
    }
    if ((riskyObjects && riskyObjects.length > 0) || imageBase64 === "") {
      const threatNames = riskyObjects.map(o => o.name).join(", ") || "Test Alert";
      const alertMessage = `⚠ ALERT: Threat detected (${threatNames}). Screenshot attached.`;
      // ✅ SMS
      if (phone) {
        await client.messages.create({
          body: alertMessage,
          from: TWILIO_PHONE,
          to: phone
        });
        console.log("📱 SMS sent:", phone);
      }
      // ✅ WhatsApp with image
      if (whatsapp) {
        await client.messages.create({
          body: alertMessage,
          from: TWILIO_WHATSAPP,
          to: `whatsapp:${whatsapp}`,
          mediaUrl: imageUrl ? [imageUrl] : []
        });
        console.log("💬 WhatsApp sent:", whatsapp);
      }
    }
    res.json({ riskyObjects, imageUrl });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Analysis failed" });
  }
});

app.listen(5000, () =>
  console.log("🚀 Backend running on http://localhost:5000")
);
