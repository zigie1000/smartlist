
const express = require("express");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
app.use(express.json({ limit: "50mb" }));

app.post("/export-word", (req, res) => {
    const { content, logo, images } = req.body;

    const tempInputPath = path.join(__dirname, "input.txt");
    fs.writeFileSync(tempInputPath, content, "utf8");

    const pyPath = path.join(__dirname, "generate_docx_FIXED_word_images.py");

    const outputPath = tempInputPath.replace(".txt", ".docx");

    const spawn = require("child_process").spawn;
    const py = spawn("python3", [pyPath, tempInputPath, logo || "", ...(images || [])]);

    py.on("close", () => {
        if (fs.existsSync(outputPath)) {
            res.download(outputPath, "PromptAgentHQ_Listing.docx", () => {
                fs.unlinkSync(outputPath);
            });
        } else {
            res.status(500).send("DOCX generation failed.");
        }
    });
});

app.listen(3000, () => console.log("Server running on port 3000"));
