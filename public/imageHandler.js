// Global references
logoImageBase64 = window.logoImageBase64;
propertyImagesBase64 = window.propertyImagesBase64;

// Handle logo upload
document.getElementById("logoInput").addEventListener("change", function (e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = function () {
        logoImageBase64 = reader.result;
        window.logoImageBase64 = logoImageBase64;
        document.getElementById("logoPreview").src = logoImageBase64;
        document.getElementById("logoPreview").style.display = "block";
    };
    if (file) {
        reader.readAsDataURL(file);
    }
});

// Handle property image uploads
document.getElementById("imageInput").addEventListener("change", function (e) {
    const files = e.target.files;
    propertyImagesBase64 = [];
    window.propertyImagesBase64 = propertyImagesBase64;
    const previewContainer = document.getElementById("imagePreviewContainer");
    previewContainer.innerHTML = "";

    Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = function () {
            const img = document.createElement("img");
            img.src = reader.result;
            img.style.maxWidth = "100px";
            img.style.margin = "5px";
            previewContainer.appendChild(img);
            propertyImagesBase64.push(reader.result);
        };
        reader.readAsDataURL(file);
    });
});

// Export to Word
function exportToWord() {
    const content = document.querySelector('.main-container').innerHTML;
    const logoHTML = (window.logoImageBase64)
      ? "<div style='text-align:center; margin-bottom:20px;'><img src='" + window.logoImageBase64 + "' alt='Logo' style='max-height:80px;' /></div>"
      : "";

    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
                   "xmlns:w='urn:schemas-microsoft-com:office:word' " +
                   "xmlns='http://www.w3.org/TR/REC-html40'>" +
                   "<head><meta charset='utf-8'><title>Document</title></head><body>";
    const footer = "</body></html>";
    const fullHTML = header + logoHTML + content + footer;

    const blob = new Blob(['ï»¿', fullHTML], {
        type: 'application/msword;charset=utf-8'
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Listing_With_Images_" + new Date().toISOString() + ".doc";
    link.click();
}

// Export to PDF
function exportToPDF() {
    const content = document.querySelector('.main-container').outerHTML;
    const logoHTML = (window.logoImageBase64)
      ? "<div style='text-align:center; margin-bottom:20px;'><img src='" + window.logoImageBase64 + "' alt='Logo' style='max-height:80px;' /></div>"
      : "";

    const styles = document.querySelector('style')?.outerHTML || '';
    const fullContent = `
        <html>
        <head>
            <title>Export PDF</title>
            ${styles}
            <style>
                @media print {
                    .emoji-print-hidden { display: none !important; }
                }
            </style>
        </head>
        <body>
            ${logoHTML}
            ${content}
        </body>
        </html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(fullContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

window.exportToWord = exportToWord;
window.exportToPDF = exportToPDF;
