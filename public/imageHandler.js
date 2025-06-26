// === GLOBALS ===
let uploadedLogoBase64 = '';
let uploadedImageBase64 = '';

// === HANDLE IMAGE FILE UPLOADS ===
function toBase64(file, callback) {
  const reader = new FileReader();
  reader.onload = function (e) {
    callback(e.target.result);
  };
  reader.readAsDataURL(file);
}

document.getElementById('logoInput')?.addEventListener('change', function () {
  const file = this.files[0];
  if (file) {
    toBase64(file, function (base64) {
      uploadedLogoBase64 = base64;
      document.getElementById('logoPreview').innerHTML = '<img src="' + base64 + '" style="max-height:60px;" />';
    });
  }
});

document.getElementById('imageInput')?.addEventListener('change', function () {
  const file = this.files[0];
  if (file) {
    toBase64(file, function (base64) {
      uploadedImageBase64 = base64;
      document.getElementById('imagePreview').innerHTML = '<img src="' + base64 + '" style="max-width:100%;" />';
    });
  }
});

// === EXPORT TO WORD ===
function exportToWord() {
  const { Document, Packer, Paragraph, ImageRun } = window.docx;
  const docChildren = [];

  // Logo (if available)
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

  // Property Image
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

  // Text
  const content = document.getElementById("output")?.innerText || '';
  docChildren.push(new Paragraph(content));

  const doc = new Document({ sections: [{ children: docChildren }] });

  Packer.toBlob(doc).then(blob => {
    saveAs(blob, "listing.docx");
  });
}

// === EXPORT TO PDF ===
function exportToPDF() {
  const output = document.getElementById("output");
  if (!output) return;

  const images = output.querySelectorAll('img');
  let loaded = 0;

  images.forEach(img => {
    if (img.complete) loaded++;
    else img.onload = () => {
      loaded++;
      if (loaded === images.length) doPDFExport();
    };
  });

  if (loaded === images.length) doPDFExport();

  function doPDFExport() {
    const opt = {
      margin: 0.5,
      filename: 'listing.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(output).save();
  }
}

// === HELPERS ===
function base64ToArrayBuffer(base64) {
  const binary = atob(base64.split(',')[1]);
  const len = binary.length;
  const buffer = new ArrayBuffer(len);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) view[i] = binary.charCodeAt(i);
  return buffer;
}

window.exportToWord = exportToWord;
window.exportToPDF = exportToPDF;
