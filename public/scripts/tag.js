let addTagButton = document.getElementById("tag-btn");
let currentTag = document.getElementById("current-tag");
let tagDisplay = document.getElementById("tag-display");
let tagContainer = document.getElementById("tags");
let tags = [];

let LIMIT = 5;
let count = 0;
if (addTagButton) {
  addTagButton.addEventListener("click", addTag);
}

function addTag() {
  if (currentTag.value) {
    if (count < LIMIT) {
      tagDisplay.innerHTML += `<li>${currentTag.value}</li>`;
      tags.push(currentTag.value);
      tagContainer.innerHTML = `<input id="tags" type="text" name="tags" value="${tags}" hidden>`;
      currentTag.value = "";
      count++;
    } else {
      alert("max tags reached");
    }
  } else {
    alert("can not use empty tags");
  }
}
