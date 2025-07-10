const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { exec } = require('child_process');
const OpenAI = require('openai');
const path = require('path');
require('dotenv').config();
const { checkTier } = require('./tierControl');

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const LICENSE_FILE = path.join(__dirname, 'licenses.json');
let licenseStore = {};

// Load licenses if file exists
if (fs.existsSync(LICENSE_FILE)) {
  licenseStore = JSON.parse(fs.readFileSync(LICENSE_FILE));
}

// Middleware to validate license key
function validateLicense(req, res, next) {
  const licenseKey = req.headers['x-license-key'];

  if (!licenseKey) {
    req.userTier = 'free';
    return next();
  }

  const entry = licenseStore[licenseKey];
  if (!entry) {
    req.userTier = 'free';
    return next();
  }

  const now = new Date();
  const expiry = new Date(entry.expires);
  req.userTier = expiry > now ? (entry.productId === 'prod_SdrRYJOQdPx77F' ? 'pro' : 'premium') : 'free';
  next();
}

// Endpoint to test license tier
app.get('/validate-license', validateLicense, (req, res) => {
  res.json({ tier: req.userTier });
});

// Reset license
app.get('/reset-license', (req, res) => {
  res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage", "executionContexts"');
  res.send('✅ License reset. Refresh browser to continue.');
});

// Lookup license by license key (optional)
app.get('/lookup-license', (req, res) => {
  const key = req.query.key;
  if (!key) return res.status(400).send("License key required");
  const entry = licenseStore[key];
  if (!entry) return res.status(404).send("License not found");
  res.json({ license: entry });
});

// OpenAI generation
app.post("/generate", validateLicense, async (req, res) => {
  const userPrompt = req.body.prompt;
  console.log("🧠 Prompt received:", userPrompt);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a real estate listing generator." },
        { role: "user", content: `Write a professional real estate listing: ${userPrompt}` }
      ],
      max_tokens: 300
    });

    const output = response.choices[0].message.content.trim();
    console.log("✅ OpenAI response:", output);
    res.json({ result: output });
  } catch (e) {
    console.error("❌ OpenAI error:", e.response?.data || e.message || e);
    res.status(500).json({ result: "Error generating listing." });
  }
});

// DOCX Export
app.post("/export-word", validateLicense, checkTier('pro'), (req, res) => {
  const { content, logo, images } = req.body;
  if (!content) return res.status(400).send("No content provided");

  const inputTextPath = "/tmp/input.txt";
  const logoPath = "/tmp/logo.png";
  const outputPath = "/tmp/PromptAgentHQ_Listing.docx";

  fs.writeFileSync(inputTextPath, content);

  if (logo && logo.startsWith("data:image")) {
    const logoBase64 = logo.split(",")[1];
    fs.writeFileSync(logoPath, Buffer.from(logoBase64, "base64"));
  }

  const imagePaths = [];
  if (Array.isArray(images)) {
    images.forEach((imgData, index) => {
      if (imgData.startsWith("data:image")) {
        const imgBase64 = imgData.split(",")[1];
        const imgPath = `/tmp/image_${index + 1}.png`;
        fs.writeFileSync(imgPath, Buffer.from(imgBase64, "base64"));
        imagePaths.push(imgPath);
      }
    });
  }

  const imageArgs = imagePaths.map(p => `"${p}"`).join(" ");
  const cmd = `python3 generate_docx.py "${inputTextPath}" "${logoPath}" ${imageArgs}`;

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Python exec error:", err.message);
      console.error(stderr);
      return res.status(500).send("DOCX generation failed.");
    }

    if (!fs.existsSync(outputPath)) {
      console.error("❌ File not created:", outputPath);
      return res.status(500).send("DOCX file not found.");
    }

    const stat = fs.statSync(outputPath);
    if (stat.size < 1000) {
      console.warn("⚠️ File created but may be invalid (too small)");
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", "attachment; filename=PromptAgentHQ_Listing.docx");
    res.sendFile(path.resolve(outputPath));
  });
});

// Serve index
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Stripe success page
app.get("/success", (req, res) => {
  res.send(`
    <h2>✅ Payment Successful</h2>
    <p>Your license key has been generated. You may now return to the app and paste it in the "License Key" field to unlock full access.</p>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
