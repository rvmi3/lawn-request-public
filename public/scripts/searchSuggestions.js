const pages = document.getElementsByClassName("page-link");

const urlParams = new URLSearchParams(window.location.search);
const search = urlParams.get("search");
console.log(search);
for (const page of pages) {
  page.addEventListener("click", async function (event) {
    if (!search) {
      window.location.href = `/?page=${event.target.innerText}`;
      return;
    }
    window.location.href = `/?page=${event.target.innerText}&search=${search}`;
  });
}
