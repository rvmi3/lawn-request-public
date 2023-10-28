const add = document.getElementById("add-file");
const sumbit = document.getElementById("upload");
const fileInput = document.getElementById("image");
const imageContainer = document.getElementById("image-container");

function fileAdded() {
  const image = fileInput.files;
  if (!image || image.length === 0) {
    imageContainer.style.display = "none";
    return;
  }
  const foundImage = image[0];

  imageContainer.src = URL.createObjectURL(foundImage);
  // imageContainer.style.display = "block";
  sumbit.style.display = "block";
  add.style.display = "none";
}

fileInput.addEventListener("change", fileAdded);
