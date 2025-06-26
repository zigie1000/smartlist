
let uploadedLogoBase64 = '';
let uploadedImageBase64 = '';

// Convert image to base64
function toBase64(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => callback(e.target.result);
  reader.readAsDataURL(file);
}

// Logo upload handler
document.getElementById('logoInput')?.addEventListener('change', function () {
  const file = this.files[0];
  if (file) {
    toBase64(file, (base64) => {
      uploadedLogoBase64 = base64;
      document.getElementById('logoPreview').innerHTML = '<img src="' + base64 + '" style="max-height:60px;" />';
    });
  }
});

// Property image upload handler
document.getElementById('imageInput')?.addEventListener('change', function () {
  const file = this.files[0];
  if (file) {
    toBase64(file, (base64) => {
      uploadedImageBase64 = base64;
      document.getElementById('imagePreview').innerHTML = '<img src="' + base64 + '" style="max-width:100%;" />';
    });
  }
});

// Export to Word with images
function exportToWord() {
  const { Document, Packer, Paragraph, ImageRun, TextRun } = window.docx;
  const docChildren = [];

  if (uploadedLogoBase64) {
    docChildren.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: base64ToArrayBuffer(uploadedLogoBase64),
            transformation: { width: 100, height: 60 }
          })
        ]
      })
    );
  }

  if (uploadedImageBase64) {
    docChildren.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: base64ToArrayBuffer(uploadedImageBase64),
            transformation: { width: 300, height: 200 }
          })
        ]
      })
    );
  }

  const content = document.getElementById("result");
  const htmlText = content?.innerText || '';
  docChildren.push(new Paragraph(htmlText));

  const doc = new Document({ sections: [{ children: docChildren }] });
  Packer.toBlob(doc).then(blob => {
    saveAs(blob, "listing.docx");
  });
}

// Export to PDF (preserve text + images + emojis)
function exportToPDF() {
  const output = document.getElementById("result");
  if (!output) return;

  const images = output.querySelectorAll("img");
  let loaded = 0;
  const total = images.length;

  if (total === 0) return doPDF();

  images.forEach(img => {
    if (img.complete) {
      loaded++;
      if (loaded === total) doPDF();
    } else {
      img.onload = () => {
        loaded++;
        if (loaded === total) doPDF();
      };
    }
  });

  function doPDF() {
    const opt = {
      margin: 0.5,
      filename: "listing.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
    };
    html2pdf().set(opt).from(output).save();
  }
}

// Helper to convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binary = atob(base64.split(',')[1]);
  const len = binary.length;
  const buffer = new ArrayBuffer(len);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

window.exportToWord = exportToWord;
window.exportToPDF = exportToPDF;
