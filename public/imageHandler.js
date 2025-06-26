// imageHandler.js

let logoImageBase64 = "";
let propertyImagesBase64 = [];

function setupImageHandlers() {
  // Handle logo preview and base64 conversion
  document.getElementById("logoFile").addEventListener("change", function () {
    const preview = document.getElementById("logo-preview");
    preview.innerHTML = "";
    const file = this.files[0];
    if (!file || file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.src = e.target.result;
      img.style.maxHeight = "60px";
      preview.appendChild(img);
      logoImageBase64 = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Handle property images
  document.getElementById("images").addEventListener("change", function () {
    const preview = document.getElementById("image-preview");
    preview.innerHTML = "";
    propertyImagesBase64 = [];
    const files = Array.from(this.files);
    if (files.length > 3) {
      alert("Maximum 3 images allowed.");
      this.value = "";
      return;
    }
    files.forEach(file => {
      if (file.size > 2 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.src = e.target.result;
        preview.appendChild(img);
        propertyImagesBase64.push(e.target.result);
      };
      reader.readAsDataURL(file);
    });
  });
}

window.customExportToWord = function () {
  const content = document.getElementById("result").innerText;
  let html = "<html><body>";

  if (logoImageBase64) {
    html += `<img src="\${logoImageBase64}" style="max-height:60px;"><br><br>`;
  }

  html += `<pre>\${content}</pre>`;

  if (propertyImagesBase64.length > 0) {
    html += "<hr><p><strong>Images:</strong></p>";
    propertyImagesBase64.forEach(src => {
      html += `<br><img src="\${src}" style="max-width:300px;"><br>`;
    });
  }

  html += "</body></html>";

  const blob = window.htmlDocx.asBlob(html, { orientation: 'portrait' });
  const filename = "Listing_With_Images_" + new Date().toISOString().replace(/[:.]/g, "-") + ".docx";
  triggerDownload(blob, filename);
};

window.customExportToPDF = function () {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const text = document.getElementById("result").innerText;
  let y = 20;

  if (logoImageBase64) {
    doc.addImage(logoImageBase64, "PNG", 15, 10, 40, 20);
    y = 35;
  }

  const lines = doc.splitTextToSize(text, 180);
  doc.text(lines, 15, y);

  y += lines.length * 7;

  propertyImagesBase64.forEach(img => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.addImage(img, "JPEG", 15, y + 10, 60, 45);
    y += 60;
  });

  const blob = doc.output("blob");
  const filename = "Listing_With_Images_" + new Date().toISOString().replace(/[:.]/g, "-") + ".pdf";
  triggerDownload(blob, filename);
};

// Optional utility for download
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Auto-initialize handlers when loaded
window.addEventListener("DOMContentLoaded", setupImageHandlers);