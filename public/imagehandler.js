// Enhance text content
function enhanceText() {
  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const features = document.getElementById("features").value;
  const agent = document.getElementById("agent").value;
  const output = document.getElementById("output");

  output.innerHTML = `
    <h1>${title}</h1>
    <p>${description}</p>
    <ul>${features.split("\n").map(f => f ? `<li>${f}</li>` : '').join('')}</ul>
    <p><strong>Agent:</strong> ${agent}</p>
  `;
}

// Resize images before export
function resizeImagesForExport() {
  const images = document.querySelectorAll("img");

  images.forEach(img => {
    if (img.naturalWidth > 600) {
      const canvas = document.createElement("canvas");
      const scaleFactor = 600 / img.naturalWidth;
      canvas.width = 600;
      canvas.height = img.naturalHeight * scaleFactor;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      img.setAttribute("data-original-src", img.src);
      img.src = canvas.toDataURL("image/jpeg", 0.85);
    }

    img.style.maxWidth = "600px";
    img.style.height = "auto";
  });
}

// Export to Word
function exportToWord() {
  resizeImagesForExport();

  const content = document.getElementById("content").cloneNode(true);

  const htmlContent = \`
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; }
          img { max-width: 600px; height: auto; }
        </style>
      </head>
      <body>\${content.innerHTML}</body>
    </html>
  \`;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "listing.doc";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export to PDF
function exportToPDF() {
  resizeImagesForExport();

  const element = document.getElementById("content");

  const opt = {
    margin:       0.5,
    filename:     'listing.pdf',
    image:        { type: 'jpeg', quality: 0.95 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
}

// Event Listeners
document.getElementById("generate").addEventListener("click", enhanceText);
document.getElementById("exportWord").addEventListener("click", exportToWord);
document.getElementById("exportPDF").addEventListener("click", exportToPDF);
