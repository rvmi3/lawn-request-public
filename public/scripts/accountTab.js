const clickableTab = document.getElementsByClassName("tab");
let clicks = 0;
for (const tab of clickableTab) {
  tab.addEventListener("click", function () {
    if (clicks > 0) {
      let currTab = document.getElementById("clicked");
      document.getElementById(currTab.innerText).style.display = "none";
      currTab.id = "";
    }

    event.target.id = "clicked";
    document.getElementById(event.target.innerText).style.display = "block";
    clicks++;
  });
}
