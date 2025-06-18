require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const OpenAI = require('openai');

const app = express();
app.use(bodyParser.json());
app.use(express.static('.'));

// ✅ OpenAI init
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

  } catch (err) {
    console.error("❌ OpenAI error:", err.response?.data || err.message);
    res.status(500).json({ result: "Error generating listing." });
  }
});

app.post('/export-word', (req, res) => {
  const content = req.body.content;
  const inputPath = '/tmp/input.txt';
  const outputPath = '/tmp/agency-listing.docx';

  try {
    fs.writeFileSync(inputPath, content);
  } catch (e) {
    console.error("❌ Failed to write input file:", e);
    return res.status(500).send("Could not write input file.");
  }

  exec(`python3 generate_docx.py ${inputPath}`, (err, stdout, stderr) => {
    if (err || !fs.existsSync(outputPath)) {
      console.error("❌ Python execution error:", stderr || err);
      return res.status(500).send("DOCX generation failed.");
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="agency-listing.docx"');
    res.sendFile(path.resolve(outputPath));
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
