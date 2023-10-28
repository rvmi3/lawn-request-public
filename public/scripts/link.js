const clickableTab = document.getElementsByClassName("clickable");
const linkInput = document.getElementById("link-input");
const linkBtn = document.getElementById("link-btn");
const form = document.getElementById("link-form");
let submitValue;
let value = "111111";

for (const val of value) {
  console.log(val);
}
for (const tab of clickableTab) {
  tab.addEventListener("click", function () {
    linkInput.value = tab.innerText;
    submitValue = tab.dataset.id;
    console.log(submitValue);
  });
}

linkBtn.addEventListener("click", function (event) {
  if (linkInput.value) {
    event.preventDefault();
    linkInput.value = submitValue;
    form.submit();
  }
});
