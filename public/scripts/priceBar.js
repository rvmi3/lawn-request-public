let priceInput = document.getElementById("price");
let inputValue = priceInput.value;
let warningText = document.getElementById("warning");
let sumbitButton = document.getElementById("submit-btn");

priceInput.addEventListener("keyup", validatePrice);
sumbitButton.addEventListener("click", validatePriceSubmission);
function validatePrice() {
  if (inputValue.startsWith("0")) {
    warningText.innerText = "Price can not start with zero";
    return;
  }
  if (!/^[0-9]+$/.test(inputValue)) {
    warningText.innerText = "Price must be number values only";
    return;
  }
  warningText.innerText = "";
}

function validatePriceSubmission(event) {
  if (inputValue.startsWith("0")) {
    event.preventDefault();
    return;
  }
  if (!/^[0-9]+$/.test(inputValue)) {
    event.preventDefault();
    return;
  }
}
