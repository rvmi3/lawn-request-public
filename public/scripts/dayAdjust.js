const checkboxes = document.getElementsByClassName("checkbox");

for (const checkbox of checkboxes) {
  console.log(checkbox);
  if (checkbox.checked) {
    console.log("checked");
    checkbox.nextElementSibling.style.display = "block";
  }
  checkbox.addEventListener("click", function (event) {
    if (event.target.checked) {
      event.target.nextElementSibling.style.display = "block";
    } else if (!event.target.checked) {
      event.target.nextElementSibling.style.display = "none";
    }
  });
}
