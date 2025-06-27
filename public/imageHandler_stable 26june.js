// imageHandler.js

let logoImageBase64 = "";
let propertyImagesBase64 = [];

function setupImageHandlers() {
  const logoInput = document.getElementById("logoFile");
  const imageInput = document.getElementById("images");
  const logoPreview = document.getElementById("logo-preview");
  const imagePreview = document.getElementById("image-preview");

  // Handle logo preview + delete
  logoInput.addEventListener("change", function () {
    logoPreview.innerHTML = "";
    const file = this.files[0];
    if (!file || file.size > 2 * 1024 * 1024) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.src = e.target.result;
      img.style.maxHeight = "60px";
      img.style.marginBottom = "8px";
      img.style.borderRadius = "4px";
      logoPreview.appendChild(img);

      const delBtn = document.createElement("button");
      delBtn.textContent = "❌ Remove Logo";
      delBtn.onclick = () => {
        logoImageBase64 = "";
        logoPreview.innerHTML = "";
        logoInput.value = "";
      };
      logoPreview.appendChild(delBtn);

      logoImageBase64 = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Handle property image upload + delete
  imageInput.addEventListener("change", function () {
    imagePreview.innerHTML = "";
    propertyImagesBase64 = [];
    const files = Array.from(this.files);
    if (files.length > 3) {
      alert("Maximum 3 images allowed.");
      this.value = "";
      return;
    }
    files.forEach((file, i) => {
      if (file.size > 2 * 1024 * 1024) return;

      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.src = e.target.result;
        img.style.maxHeight = "100px";
        img.style.margin = "5px";
        img.style.borderRadius = "6px";
        imagePreview.appendChild(img);
        propertyImagesBase64.push(e.target.result);

        const delBtn = document.createElement("button");
        delBtn.textContent = `❌ Remove Image ${i + 1}`;
        delBtn.onclick = () => {
          propertyImagesBase64.splice(i, 1);
          imagePreview.innerHTML = "";
          imageInput.value = "";
        };
        imagePreview.appendChild(delBtn);
      };
      reader.readAsDataURL(file);
    });
  });
}

// WORD export
window.customExportToWord = function () {
  const content = document.getElementById("result").innerHTML;
  let html = "<html><body style='font-family:Arial;'>";

  if (logoImageBase64) {
    html += `<div style="text-align:center;"><img src="${logoImageBase64}" style="max-height:60px;"></div><br>`;
  }

  html += `<div>${content}</div>`;

  if (propertyImagesBase64.length > 0) {
    html += "<hr><p><strong>Property Images:</strong></p>";
    propertyImagesBase64.forEach(src => {
      html += `<img src="${src}" style="max-width:300px; max-height:200px; margin:10px 0;"><br>`;
    });
  }

  html += "</body></html>";

  const blob = window.htmlDocx.asBlob(html);
  const filename = "Listing_With_Images_" + new Date().toISOString().replace(/[:.]/g, "-") + ".docx";
  triggerDownload(blob, filename);
};

// PDF export
window.customExportToPDF = function () {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const text = document.getElementById("result").innerText;
  let y = 20;

  if (logoImageBase64) {
    doc.addImage(logoImageBase64, "PNG", 80, 10, 50, 20); // Centered
    y = 35;
  }

  const lines = doc.splitTextToSize(text, 180);
  doc.text(lines, 15, y);
  y += lines.length * 7;

  propertyImagesBase64.forEach(img => {
    if (y > 240) {
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

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

window.addEventListener("DOMContentLoaded", setupImageHandlers);
