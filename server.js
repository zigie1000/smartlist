require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { exec } = require('child_process');
const OpenAI = require('openai');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------- AI TEXT GENERATION ----------
app.post('/generate', async (req, res) => {
  const userPrompt = req.body.prompt;
  if (!userPrompt) return res.status(400).send("Prompt is required");

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: "system", content: "You are a real estate listing generator." },
        { role: "user", content: `Write a professional real estate listing: ${userPrompt}` }
      ],
      max_tokens: 300
    });

    const output = response.choices[0].message.content.trim();
    console.log("🧠 OpenAI response:", output);
    res.json({ result: output });
  } catch (e) {
    console.error("❌ OpenAI error:", e.response?.data || e.message || e);
    res.status(500).json({ error: "Error generating listing." });
  }
});

// ---------- EXPORT WORD DOCUMENT ----------
app.post('/export-word', (req, res) => {
  const { content, logo, images } = req.body;
  if (!content) return res.status(400).send("No content provided");

  const inputTextPath = "/tmp/input.txt";
  const outputDocxPath = "/tmp/PromptAgentHQ_Listing.docx";
  const logoPath = "/tmp/logo.png";
  const imagePaths = [];

  // Save the listing text
  fs.writeFileSync(inputTextPath, content, 'utf-8');

  // Handle logo
  if (logo && logo.startsWith("data:image")) {
    const base64Data = logo.split(',')[1];
    fs.writeFileSync(logoPath, Buffer.from(base64Data, "base64"));
  }

  // Handle up to 3 property images
  if (Array.isArray(images)) {
    images.slice(0, 3).forEach((imgData, index) => {
      if (imgData && imgData.startsWith("data:image")) {
        const base64 = imgData.split(',')[1];
        const imgPath = `/tmp/image${index + 1}.png`;
        fs.writeFileSync(imgPath, Buffer.from(base64, "base64"));
        imagePaths.push(imgPath);
      }
    });
  }

  // Build image args
  const imageArgs = imagePaths.map(p => `"${p}"`).join(" ");
  const cmd = `python3 generate_docxStable30June.py "${inputTextPath}" "${outputDocxPath}" "${logoPath}" ${imageArgs}`;

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Python exec error:", err.message);
      console.error(stderr);
      return res.status(500).send("DOCX generation failed.");
    }

    if (!fs.existsSync(outputDocxPath)) {
      console.error("❌ DOCX file not found:", outputDocxPath);
      return res.status(500).send("DOCX file not created.");
    }

    const stat = fs.statSync(outputDocxPath);
    if (stat.size < 1000) {
      console.warn("⚠️ File too small, possibly invalid.");
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", "attachment; filename=PromptAgentHQ_Listing.docx");
    res.sendFile(outputDocxPath);
  });
});

// ---------- EXPORT PDF (if needed) ----------
app.post('/export-pdf', (req, res) => {
  res.status(501).send("PDF export not yet implemented.");
});

// ---------- HOME PAGE ----------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
