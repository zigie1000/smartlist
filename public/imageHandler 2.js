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
  document.getElementById("images").addEventListener("change", function (event) {
  const files = Array.from(event.target.files);
  const preview = document.getElementById("image-preview");
  preview.innerHTML = "";
  propertyImagesBase64 = [];

  if (files.length > 3) {
    alert("You can upload a maximum of 3 images.");
    event.target.value = "";
    return;
  }

  files.forEach((file, index) => {
    if (file.size <= 2 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.style.display = "inline-block";
        wrapper.style.marginRight = "10px";

        const img = document.createElement("img");
        img.src = e.target.result;
        img.style.height = "100px";
        img.style.borderRadius = "6px";

        const delBtn = document.createElement("button");
        delBtn.innerText = "×";
        delBtn.className = "delete-btn";
        delBtn.style.position = "absolute";
        delBtn.style.top = "-5px";
        delBtn.style.right = "-5px";
        delBtn.style.border = "none";
        delBtn.style.background = "red";
        delBtn.style.color = "white";
        delBtn.style.borderRadius = "50%";
        delBtn.style.width = "20px";
        delBtn.style.height = "20px";
        delBtn.style.cursor = "pointer";

        delBtn.onclick = function () {
          const idx = propertyImagesBase64.indexOf(e.target.result);
          if (idx > -1) propertyImagesBase64.splice(idx, 1);
          wrapper.remove();
        };

        wrapper.appendChild(img);
        wrapper.appendChild(delBtn);
        preview.appendChild(wrapper);

        propertyImagesBase64.push(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Each image must be 2MB or less.");
    }
  });
});
  });
}

window.customExportToWord = function () {
  const content = document.getElementById("result").innerHTML; // ✅ FIXED: innerHTML
  let html = "<html><body>";

  if (logoImageBase64) {
    html += `<img src="${logoImageBase64}" style="max-height:60px;"><br><br>`;
  }

  html += content;

  if (propertyImagesBase64.length > 0) {
    html += "<hr><p><strong>Images:</strong></p>";
    propertyImagesBase64.forEach(src => {
      html += `<img src="${src}" style="max-width:300px;"><br>`;
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

// Utility for download
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
