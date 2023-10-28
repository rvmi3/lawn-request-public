const comments = document.querySelectorAll(".list-group-item");
const loadMoreButton = document.getElementById("loadMoreButton");
let visibleComments = 5; // Initially, display 5 comments

// Function to toggle the visibility of comments
const toggleCommentsVisibility = () => {
  for (let i = 0; i < comments.length; i++) {
    if (i < visibleComments) {
      comments[i].style.display = "block";
    } else {
      comments[i].style.display = "none";
    }
  }

  if (visibleComments >= comments.length) {
    loadMoreButton.style.display = "none"; // Hide the "Load More" button when all comments are visible
  } else {
    loadMoreButton.style.display = "block";
  }
};

// Initial setup
toggleCommentsVisibility();

// Event listener for the "Load More" button
loadMoreButton.addEventListener("click", () => {
  visibleComments += 5; // Show 5 more comments
  toggleCommentsVisibility();
});
