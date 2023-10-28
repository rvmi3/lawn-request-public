const expandButtons = document.getElementsByClassName("expand");
const collapseButtons = document.getElementsByClassName("collapse");

for (const expandButton of expandButtons) {
  expandButton.addEventListener("click", async function () {
    expandButton.parentElement.style.display = "none";
    expandButton.parentElement.nextElementSibling.style.display = "block";
  });
}

for (const collapseButton of collapseButtons) {
  collapseButton.addEventListener("click", async function () {
    collapseButton.parentElement.style.display = "none";
    collapseButton.parentElement.previousElementSibling.style.display = "block";
  });
}
