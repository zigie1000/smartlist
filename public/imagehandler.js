let uploadedLogoBase64 = '';
let uploadedImageBase64 = '';

function toBase64(file, callback) {
  const reader = new FileReader();
  reader.onloadend = () => callback(reader.result);
  reader.readAsDataURL(file);
}

document.getElementById('logoInput')?.addEventListener('change', function () {
  const file = this.files[0];
  if (file) {
    toBase64(file, (base64) => {
      uploadedLogoBase64 = base64;
      document.getElementById('logoPreview').innerHTML = '<img src="' + base64 + '" style="max-height:60px;" />';
      // Add logo to result so PDF includes it
      const logoImg = document.createElement('img');
      logoImg.src = base64;
      logoImg.style = "max-height:60px; margin-bottom:10px;";
      document.getElementById('result').prepend(logoImg);
    });
  }
});

document.getElementById('imageInput')?.addEventListener('change', function () {
  const file = this.files[0];
  if (file) {
    toBase64(file, (base64) => {
      uploadedImageBase64 = base64;
      document.getElementById('imagePreview').innerHTML = '<img src="' + base64 + '" style="max-height:100px;" />';
      // Add property image to result so PDF includes it
      const propImg = document.createElement('img');
      propImg.src = base64;
      propImg.style = "max-height:100px; margin-top:10px; margin-bottom:10px;";
      document.getElementById('result').appendChild(propImg);
    });
  }
});

document.getElementById('exportWord')?.addEventListener('click', async () => {
  const content = document.getElementById('result');
  const docChildren = [];

  // Add logo image if present
  if (uploadedLogoBase64) {
    const imageBuffer = await fetch(uploadedLogoBase64).then(res => res.arrayBuffer());
    docChildren.push(new docx.Paragraph({
      children: [new docx.ImageRun({
        data: imageBuffer,
        transformation: { width: 150, height: 60 }
      })],
      spacing: { after: 200 }
    }));
  }

  // Add each line of text separately to preserve emojis
  const textLines = content?.innerText?.split('\n') || [];
  textLines.forEach(line => {
    docChildren.push(new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: line,
          font: "Segoe UI Emoji"
        })
      ]
    }));
  });

  // Add property image if present
  if (uploadedImageBase64) {
    const imageBuffer = await fetch(uploadedImageBase64).then(res => res.arrayBuffer());
    docChildren.push(new docx.Paragraph({
      children: [new docx.ImageRun({
        data: imageBuffer,
        transformation: { width: 400, height: 300 }
      })],
      spacing: { before: 300 }
    }));
  }

  const doc = new docx.Document({ sections: [{ properties: {}, children: docChildren }] });
  const blob = await docx.Packer.toBlob(doc);
  const filename = "PromptAgentHQ_Listing_" + new Date().toISOString().replace(/[:.]/g, '-') + ".docx";
  saveAs(blob, filename);
});

document.getElementById('exportPDF')?.addEventListener('click', () => {
  const content = document.getElementById('result');
  const opt = {
    margin: 0.5,
    filename: "PromptAgentHQ_Listing_" + new Date().toISOString().replace(/[:.]/g, '-') + ".pdf",
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(content).save();
});
