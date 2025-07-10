// --- License Store Setup ---
const fs = require('fs');
const path = require('path');

const LICENSE_STORE_PATH = path.join(__dirname, 'data', 'licenseStore.json');

// Ensure the license store directory and file exist
function ensureLicenseStore() {
  const dir = path.dirname(LICENSE_STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  if (!fs.existsSync(LICENSE_STORE_PATH)) {
    fs.writeFileSync(LICENSE_STORE_PATH, '[]', 'utf8');
  }
}

// Load licenses from file
function loadLicenses() {
  ensureLicenseStore();
  try {
    const data = fs.readFileSync(LICENSE_STORE_PATH, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading license store:', err);
    return [];
  }
}

// Save licenses to file
function saveLicenses(licenses) {
  try {
    fs.writeFileSync(LICENSE_STORE_PATH, JSON.stringify(licenses, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving license store:', err);
  }
}
// --- End License Store Setup ---

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { exec } = require('child_process');
const OpenAI = require('openai');
const path = require('path');
const axios = require('axios');
require('dotenv').config();
const { checkTier } = require('./tierControl');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// License validation middleware
async function validateLicense(req, res, next) {
  const licenseKey = req.headers['x-license-key'];
  if (!licenseKey) {
    req.userTier = "free";
    return next();
  }

  // Handle test keys manually
  if (licenseKey.startsWith('test_')) {
    if (licenseKey === 'test_monthly_abc') {
      req.userTier = 'pro';
    } else if (licenseKey === 'test_annual_xyz') {
      req.userTier = 'premium';
    } else {
      req.userTier = 'free';
    }
    return next();
  }

  try {
    const response = await axios.post(
      'https://api.lemonsqueezy.com/v1/licenses/validate',
      { license_key: licenseKey },
      {
        headers: {
          Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY_TEST}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const valid = response.data?.data?.valid;
    req.userTier = valid ? (response.data.data.license.variant_name.toLowerCase()) : "free";
  } catch (err) {
    console.warn("License validation failed:", err.message || err);
    req.userTier = "free";
  }
  next();
}

// Test endpoint
app.get('/validate-license', validateLicense, (req, res) => {
  res.json({ tier: req.userTier });
});

// Reset license (optional for testing, use with caution)
app.get('/reset-license', (req, res) => {
  res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage", "executionContexts"');
  res.send('â License reset. Refresh browser to continue.');
});

// OpenAI text generation
app.post("/generate", async (req, res) => {
  const userPrompt = req.body.prompt;
  console.log("ð§  Prompt received:", userPrompt);

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
    console.log("â OpenAI response:", output);
    res.json({ result: output });
  } catch (e) {
    console.error("â OpenAI error:", e.response?.data || e.message || e);
    res.status(500).json({ result: "Error generating listing." });
  }
});

// DOCX export with logo and images
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
      console.error("â Python exec error:", err.message);
      console.error(stderr);
      return res.status(500).send("DOCX generation failed.");
    }

    if (!fs.existsSync(outputPath)) {
      console.error("â File not created:", outputPath);
      return res.status(500).send("DOCX file not found.");
    }

    const stat = fs.statSync(outputPath);
    if (stat.size < 1000) {
      console.warn("â ï¸ File created but may be invalid (too small)");
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", "attachment; filename=PromptAgentHQ_Listing.docx");
    res.sendFile(path.resolve(outputPath));
  });
});

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
// â Serve success page
app.get('/success', (req, res) => {
  res.send(`
    <h2>â Payment Successful</h2>
    <p>Your license has been activated. You can now return to the app and use your license key.</p>
  `);
});

// â Lookup license by email (optional)
app.get('/lookup-license', (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).send("Email required");

  const licensePath = path.join(__dirname, 'licenseStore.json');
  if (!fs.existsSync(licensePath)) return res.status(404).send("License store not found");

  const licenses = JSON.parse(fs.readFileSync(licensePath, 'utf-8'));
  const entry = licenses[email];
  if (!entry) return res.status(404).send("No license found for this email");

  res.json({ license: entry });
});

app.listen(PORT, () => console.log(`ð Server running at http://localhost:${PORT}`));
