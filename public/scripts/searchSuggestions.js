const pages = document.getElementsByClassName("page-link");

const urlParams = new URLSearchParams(window.location.search);
const search = urlParams.get("search");
const unavailable = urlParams.get("unavailable");
console.log(unavailable);
console.log(search);
for (const page of pages) {
  page.addEventListener("click", async function (event) {
    window.location.href = `/?page=${event.target.innerText}&search=${search}&unavailable=${unavailable}`;
  });
}
