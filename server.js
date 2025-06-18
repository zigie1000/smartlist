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

// OpenAI endpoint
app.post('/generate', async (req, res) => {
  const userPrompt = req.body.prompt;
  try {
    const response = await new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      .chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a real estate listing generator." },
          { role: "user", content: `Write a professional real estate listing: ${userPrompt}` }
        ],
        max_tokens: 300
      });
    res.json({ result: response.choices[0].message.content.trim() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ result: "Error generating listing." });
  }
});

// Backend DOCX export
app.post('/export-word', (req, res) => {
  const content = req.body.content;
  const agent   = req.body.agent || "";

  if (!content) return res.status(400).send("No content provided");

  const inputPath  = '/tmp/input.txt';
  const outputPath = '/tmp/PromptAgentHQ_Listing.docx';
  const fullText   = agent
    ? `Agent: ${agent}\n\n${content}`
    : content;

  // Write the combined text
  fs.writeFileSync(inputPath, fullText);

  // Invoke Python to build the .docx
  exec(`python3 generate_docx.py ${inputPath}`, (err, stdout, stderr) => {
    if (err || !fs.existsSync(outputPath)) {
      console.error("DOCX generation failed:", err || "file missing", stderr);
      return res.status(500).send("Failed to create DOCX.");
    }

    // Force a download, just like your text export
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="PromptAgentHQ_Listing.docx"'
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.sendFile(path.resolve(outputPath));
  });
});

// Serve your SPA
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
