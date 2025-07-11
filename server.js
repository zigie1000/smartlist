const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { exec } = require('child_process');
const OpenAI = require('openai');
const path = require('path');
require('dotenv').config();

let { checkTier } = require('./tierControl');
const { supabase } = require('./licenseManager');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ Fallback checkTier
if (typeof checkTier !== 'function') {
  console.warn("⚠️ checkTier not found or invalid — fallback being used.");
  checkTier = (requiredTier) => (req, res, next) => {
    const levels = ['free', 'pro', 'premium'];
    const user = levels.indexOf(req.userTier || 'free');
    const required = levels.indexOf(requiredTier);
    if (user >= required) return next();
    return res.status(403).json({ error: 'Insufficient license tier' });
  };
}

// ✅ Modern license validation (Supabase)
async function validateLicense(req, res, next) {
  const licenseKey = req.headers['x-license-key'];
  const email = req.headers['x-user-email'];

  if (!licenseKey && !email) {
    req.userTier = "free";
    return next();
  }

  // 🎫 Test key shortcut
  if (licenseKey?.startsWith('test_')) {
    if (licenseKey.includes('monthly')) req.userTier = 'pro';
    else if (licenseKey.includes('annual')) req.userTier = 'premium';
    else req.userTier = 'free';
    return next();
  }

  try {
    const { data, error } = await supabase
      .from('licenses')
      .select('license_type, expires_at, status')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      console.warn("🔍 No license found — fallback to free.");
      req.userTier = 'free';
      return next();
    }

    const license = data[0];
    const now = new Date();
    if (license.status !== 'active' || new Date(license.expires_at) < now) {
      req.userTier = 'free';
    } else {
      req.userTier = license.license_type || 'free';
    }

  } catch (err) {
    console.error("❌ Supabase license check failed:", err.message);
    req.userTier = 'free';
  }

  next();
}

// 🧪 Test license
app.get('/validate-license', validateLicense, (req, res) => {
  res.json({ tier: req.userTier });
});

// 🧹 Cache reset
app.get('/reset-license', (req, res) => {
  res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage", "executionContexts"');
  res.send('✅ License reset.');
});

// 🤖 Generate listing
app.post("/generate", async (req, res) => {
  const userPrompt = req.body.prompt;
  console.log("🧠 Prompt:", userPrompt);

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
    console.log("✅ Generated:", output);
    res.json({ result: output });
  } catch (e) {
    console.error("❌ OpenAI Error:", e.response?.data || e.message);
    res.status(500).json({ result: "Error generating listing." });
  }
});

// 📄 Export Word
app.post("/export-word", validateLicense, checkTier('pro'), (req, res) => {
  const { content, logo, images } = req.body;
  if (!content) return res.status(400).send("No content provided");

  const inputTextPath = "/tmp/input.txt";
  const logoPath = "/tmp/logo.png";
  const outputPath = "/tmp/PromptAgentHQ_Listing.docx";

  fs.writeFileSync(inputTextPath, content);

  if (logo && logo.startsWith("data:image")) {
    const base64 = logo.split(",")[1];
    fs.writeFileSync(logoPath, Buffer.from(base64, "base64"));
  }

  const imagePaths = [];
  if (Array.isArray(images)) {
    images.forEach((img, i) => {
      if (img.startsWith("data:image")) {
        const base64 = img.split(",")[1];
        const imgPath = `/tmp/image_${i + 1}.png`;
        fs.writeFileSync(imgPath, Buffer.from(base64, "base64"));
        imagePaths.push(imgPath);
      }
    });
  }

  const imgArgs = imagePaths.map(p => `"${p}"`).join(" ");
  const cmd = `python3 generate_docx.py "${inputTextPath}" "${logoPath}" ${imgArgs}`;

  exec(cmd, (err, stdout, stderr) => {
    if (err || !fs.existsSync(outputPath)) {
      console.error("❌ DOCX error:", err?.message || 'Output missing');
      return res.status(500).send("DOCX generation failed.");
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", "attachment; filename=PromptAgentHQ_Listing.docx");
    res.sendFile(path.resolve(outputPath));
  });
});

// 🌍 Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
