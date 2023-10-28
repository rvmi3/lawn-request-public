const inputValue = document.getElementById("id-input").value;
const purchaseButton = document.getElementById("purchase-btn");

purchaseButton.addEventListener("click", async function (event) {
  const input = document.getElementById("id-input");
  if (input.value !== inputValue) {
    alert("ID Error! Try Again");
    event.preventDefault();
    location.reload();
  }
});
