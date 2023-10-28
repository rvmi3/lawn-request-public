const postTitleLink = document.querySelectorAll(".image-link");

for (post of postTitleLink) {
  let clicks = 0;
  const postImage = post.children[0];
  post.addEventListener("click", function () {
    if (clicks % 2 == 0) {
      postImage.style.display = "block";
    } else if (clicks % 2 == 1) {
      postImage.style.display = "none";
    }
  });
}
