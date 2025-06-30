
document.addEventListener("DOMContentLoaded", function () {
  const logoInput = document.getElementById("logoInput");
  const propertyImagesInput = document.getElementById("propertyImages");
  const logoPreview = document.getElementById("logoPreview");
  const propertyPreview = document.getElementById("propertyPreview");

  if (logoInput) {
    logoInput.addEventListener("change", function () {
      const file = logoInput.files[0];
      logoPreview.innerHTML = "";
      if (file && file.size <= 2 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const img = document.createElement("img");
          img.src = e.target.result;
          img.style.maxWidth = "100px";
          img.style.marginRight = "10px";

          const delBtn = document.createElement("button");
          delBtn.innerText = "❌";
          delBtn.onclick = function () {
            logoInput.value = "";
            logoPreview.innerHTML = "";
          };
          logoPreview.appendChild(img);
          logoPreview.appendChild(delBtn);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (propertyImagesInput) {
    propertyImagesInput.addEventListener("change", function () {
      propertyPreview.innerHTML = "";
      const files = Array.from(propertyImagesInput.files).slice(0, 3);
      files.forEach((file, index) => {
        if (file && file.size <= 2 * 1024 * 1024) {
          const reader = new FileReader();
          reader.onload = function (e) {
            const img = document.createElement("img");
            img.src = e.target.result;
            img.style.maxWidth = "100px";
            img.style.marginRight = "10px";

            const delBtn = document.createElement("button");
            delBtn.innerText = "❌";
            delBtn.onclick = function () {
              const newFiles = Array.from(propertyImagesInput.files).filter((_, i) => i !== index);
              const dataTransfer = new DataTransfer();
              newFiles.forEach(f => dataTransfer.items.add(f));
              propertyImagesInput.files = dataTransfer.files;
              propertyImagesInput.dispatchEvent(new Event("change"));
            };

            const wrapper = document.createElement("div");
            wrapper.style.display = "inline-block";
            wrapper.appendChild(img);
            wrapper.appendChild(delBtn);
            propertyPreview.appendChild(wrapper);
          };
          reader.readAsDataURL(file);
        }
      });
    });
  }
});
