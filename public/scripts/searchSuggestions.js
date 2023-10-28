const pages = document.getElementsByClassName("page");

for (const page of pages) {
  page.addEventListener("click", async function (event) {
    window.location.href = `/?page=${event.target.innerText}`;
  });
}
