require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { exec } = require('child_process');
const OpenAI = require('openai');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/generate', async (req, res) => {
  const userPrompt = req.body.prompt;
  console.log("📩 Prompt received:", userPrompt);

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

app.post('/export-word', (req, res) => {
  const content = req.body.content;
  if (!content) return res.status(400).send("No content provided");

  const inputPath = '/tmp/input.txt';
  const outputPath = '/tmp/PromptAgentHQ_Listing.docx';

  fs.writeFileSync(inputPath, content);

  exec(`python3 generate_docx.py ${inputPath}`, (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Python exec error:", err.message);
      console.error(stderr);
      return res.status(500).send("Python generation failed.");
    }

    if (!fs.existsSync(outputPath)) {
      console.error("❌ File not created:", outputPath);
      return res.status(500).send("DOCX file not found.");
    }

    const stat = fs.statSync(outputPath);
    if (stat.size < 1000) {
      console.warn("⚠️ File created but may be invalid (too small)");
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="PromptAgentHQ_Listing.docx"');
    res.sendFile(path.resolve(outputPath));
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
