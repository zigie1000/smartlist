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
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
                   "xmlns:w='urn:schemas-microsoft-com:office:word' " +
                   "xmlns='http://www.w3.org/TR/REC-html40'>" +
                   "<head><meta charset='utf-8'><title>Document</title></head><body>";
    const footer = "</body></html>";
    const fullHTML = header + content + footer;

    const blob = new Blob(['\ufeff', fullHTML], {
        type: 'application/msword;charset=utf-8'
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Listing_With_Images_" + new Date().toISOString() + ".doc";
    link.click();
}

// Export to PDF
function exportToPDF() {
    const printWindow = window.open('', '_blank');
    const content = document.querySelector('.main-container').outerHTML;
    const styles = document.querySelector('style')?.outerHTML || '';
    const headContent = `
        <html>
        <head>
        <title>Export PDF</title>
        ${styles}
        <style>
            @media print {
                .emoji-print-hidden {
                    display: none !important;
                }
            }
        </style>
        </head>
        <body>
            ${content}
        </body>
        </html>`;

    printWindow.document.write(headContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}
