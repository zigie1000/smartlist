require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require("openai");
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

app.post('/generate', async (req, res) => {
  try {
    const prompt = req.body.prompt;
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    });

    const result = completion.data.choices[0].message.content.trim();
    res.json({ result });
  } catch (err) {
    console.error('❌ OpenAI error:', err);
    res.status(500).json({ error: 'Error generating listing' });
  }
});

app.post('/export-word', async (req, res) => {
  try {
    const content = req.body.content;
    const tempTxtPath = path.join(__dirname, 'temp_input.txt');
    const outputDocxPath = path.join(__dirname, 'downloads', 'PromptAgentHQ_Listing.docx');

    fs.writeFileSync(tempTxtPath, content, 'utf8');

    exec(`python3 generate_docx.py "${tempTxtPath}" "${outputDocxPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Python script error:', error);
        return res.status(500).send('Word export failed.');
      }

      if (!fs.existsSync(outputDocxPath)) {
        return res.status(404).send('DOCX not generated.');
      }

      res.download(outputDocxPath, 'PromptAgentHQ_Listing.docx', err => {
        if (err) console.error('Download error:', err);
      });
    });
  } catch (err) {
    console.error('❌ Export error:', err);
    res.status(500).send('Error exporting to Word.');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});
