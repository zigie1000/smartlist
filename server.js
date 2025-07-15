const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { exec } = require('child_process');
const OpenAI = require('openai');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const { supabase } = require('./licenseManager');
const { checkTier } = require('./tierControl');

const app = express();

// ✅ Mount static frontend
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Stripe Webhook must come BEFORE body parsing
app.use('/webhook', express.raw({ type: 'application/json' }), require('./stripeWebhook'));

// ✅ Add JSON body parser for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ Supabase-only license validator
async function validateLicense(req, res, next) {
  const email = req.headers['x-user-email'];
  let tier = 'free';

  try {
    if (email) {
      const { data } = await supabase
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
  } catch (err) {
    console.warn("⚠️ License validation failed:", err.message);
  }

  req.userTier = tier;
  next();
}

// ✅ License check endpoint
app.get('/validate-license', validateLicense, (req, res) => {
  res.json({ tier: req.userTier });
});

// ✅ Resolve license endpoint
app.get('/resolve-license', validateLicense, async (req, res) => {
  const email = req.headers['x-user-email'];
  if (!email) {
    return res.json({ licenseKey: null });
  }

  try {
    const { data } = await supabase
      .from('licenses')
      .select('license_type')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data && data.license_type) {
      console.log(`Resolved license for ${email}: ${data.license_type}`);
      res.json({ licenseKey: data.license_type });
    } else {
      console.log(`No license found for ${email}`);
      res.json({ licenseKey: null });
    }
  } catch (err) {
    console.warn("⚠️ License resolution failed:", err.message);
    res.json({ licenseKey: null });
  }
});

// 🧹 Developer reset route
app.get('/reset-license', (req, res) => {
  res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage", "executionContexts"');
  res.send('✅ License reset.');
});

// 🤖 AI Listing Generator
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

// 📄 DOCX Export Endpoint
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

// ✅ Stripe metadata-based license update
app.post('/stripe/update-license', async (req, res) => {
  const { email, plan, license_type, stripe_customer, stripe_product } = req.body;

  if (!email || !plan || !license_type || !stripe_customer || !stripe_product) {
    return res.status(400).json({ error: "Missing required license fields" });
  }

  try {
    const { error } = await supabase
      .from('licenses')
      .insert([{
        email,
        plan,
        license_type,
        stripe_customer,
        stripe_product,
        status: 'active',
        is_active: true,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }]);

    if (error) throw error;
    res.status(200).json({ message: '✅ License saved in Supabase' });
  } catch (err) {
    console.error("❌ Supabase insert failed:", err.message);
    res.status(500).json({ error: 'Failed to update license' });
  }
});

// 🌍 Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🚀 Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
