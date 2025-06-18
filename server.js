app.post('/export-word', (req, res) => {
  const content = req.body.content;
  const agent = req.body.agent || "";

  if (!content) return res.status(400).send("No content provided");

  const inputPath = '/tmp/input.txt';
  const outputPath = '/tmp/PromptAgentHQ_Listing.docx';

  const fullContent = agent ? `Agent: ${agent}\n\n${content}` : content;
  fs.writeFileSync(inputPath, fullContent);

  exec(`python3 generate_docx.py ${inputPath}`, (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Python exec error:", err.message);
      console.error(stderr);
      return res.status(500).send("DOCX generation failed.");
    }

    if (!fs.existsSync(outputPath)) {
      console.error("❌ File not created:", outputPath);
      return res.status(500).send("DOCX file not found.");
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="PromptAgentHQ_Listing.docx"');
    res.sendFile(path.resolve(outputPath));
  });
});
