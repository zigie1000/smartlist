document.addEventListener('DOMContentLoaded', function () {
  const logoInput = document.getElementById('logoInput');
  const imageInput = document.getElementById('imageInput');
  const logoPreview = document.getElementById('logoPreview');
  const imagePreview = document.getElementById('imagePreview');
  let images = [];

  logoInput.addEventListener('change', function () {
    const file = logoInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        logoPreview.innerHTML = `
          <img src="${e.target.result}" class="preview-img">
          <span class="delete-btn" onclick="removeLogo()">✖</span>`;
        logoPreview.dataset.logo = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  imageInput.addEventListener('change', function () {
    if (images.length >= 3) return alert("Maximum of 3 images allowed.");
    const file = imageInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const imgData = e.target.result;
        const index = images.length;
        images.push(imgData);
        const div = document.createElement('div');
        div.innerHTML = `
          <img src="${imgData}" class="preview-img">
          <span class="delete-btn" onclick="removeImage(${index})">✖</span>`;
        imagePreview.appendChild(div);
      };
      reader.readAsDataURL(file);
    }
  });

  window.removeLogo = function () {
    logoPreview.innerHTML = '';
    delete logoPreview.dataset.logo;
    logoInput.value = '';
  };

  window.removeImage = function (index) {
    images.splice(index, 1);
    updatePreview();
  };

  function updatePreview() {
    imagePreview.innerHTML = '';
    images.forEach((imgData, idx) => {
      const div = document.createElement('div');
      div.innerHTML = `
        <img src="${imgData}" class="preview-img">
        <span class="delete-btn" onclick="removeImage(${idx})">✖</span>`;
      imagePreview.appendChild(div);
    });
  }

  window.getImages = () => images;
  window.getLogo = () => logoPreview.dataset.logo || '';
});
