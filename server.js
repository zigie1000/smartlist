const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { exec } = require('child_process');
const OpenAI = require('openai');
const path = require('path');
require('dotenv').config();

const { supabase } = require('./licenseManager');

let checkTier; // ✅ Don't import, define fallback below

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ Fallback checkTier if missing
if (typeof checkTier !== 'function') {
  console.warn("⚠️ 'checkTier' not defined properly, using fallback.");
  checkTier = (requiredTier) => (req, res, next) => {
    const tiers = ['free', 'pro', 'premium'];
    const userIndex = tiers.indexOf(req.userTier || 'free');
    const requiredIndex = tiers.indexOf(requiredTier);
    if (userIndex >= requiredIndex) return next();
    return res.status(403).json({ error: "Insufficient license tier" });
  };
}

// ✅ License validator (Supabase + fallback)
async function validateLicense(req, res, next) {
  const email = req.headers['x-user-email'];
  const licenseKey = req.headers['x-license-key'];
  let tier = 'free';

  try {
    // Check Supabase by email
    if (email) {
      const { data, error } = await supabase
        .from('licenses')
        .select('license_type, expires_at, status')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data[0]) {
        const now = new Date();
        const expiresAt = new Date(data[0].expires_at);
        if (data[0].status === 'active' && expiresAt > now) {
          tier = data[0].license_type || 'free';
        }
      }
    }

    // Fallback: local license store
    if (tier === 'free' && licenseKey) {
      const licensePath = path.join(__dirname, 'licenseStore.json');
      if (fs.existsSync(licensePath)) {
        const licenses = JSON.parse(fs.readFileSync(licensePath, 'utf-8'));
        const entry = licenses[licenseKey];
        if (entry && entry.expires && new Date(entry.expires) > new Date()) {
          tier = entry.tier || 'pro';
        }
      }

      // Test license key fallback
      if (licenseKey.startsWith('test_')) {
        if (licenseKey.includes('monthly')) tier = 'pro';
        else if (licenseKey.includes('annual')) tier = 'premium';
      }
    }
  } catch (err) {
    console.warn("⚠️ License validation failed:", err.message);
  }

  req.userTier = tier;
  next();
}

// ✅ License test route
app.get('/validate-license', validateLicense, (req, res) => {
  res.json({ tier: req.userTier });
});

// 🧹 Clear license (dev only)
app.get('/reset-license', (req, res) => {
  res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage", "executionContexts"');
  res.send('✅ License reset.');
});

// 🤖 Real estate AI
app.post("/generate", async (req, res) => {
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

// 📄 Word export
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
    if (err || !fs.existsSync(outputPath)) {
      console.error("❌ DOCX error:", err?.message || 'Missing output');
      return res.status(500).send("DOCX generation failed.");
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", "attachment; filename=PromptAgentHQ_Listing.docx");
    res.sendFile(path.resolve(outputPath));
  });
});

// 🌐 Serve static homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
