const checkable = document.getElementsByClassName("checkbox");
const timeSection = document.getElementsByClassName("time-selection");

const s = document.getElementsByClassName("hours-start");
const e = document.getElementsByClassName("hours-end");

const st = document.getElementsByClassName("hours-start-tod");
const et = document.getElementsByClassName("hours-end-tod");

getNotificationSettings();
setTimeout(setup, 500);

function setup() {
  const checkboxes = document.getElementsByClassName("checkbox");

  for (const checkbox of checkboxes) {
    if (checkbox.checked) {
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
}

async function getNotificationSettings() {
  const settings = await fetch(`/availabilityData`);
  const data = await settings.json();

  for (let i = 0; i < checkable.length; i++) {
    if (data[checkable[i].name].rpd > 0) {
      let start = data[checkable[i].name].start;
      let end = data[checkable[i].name].end;

      let start_tod = "am";
      let end_tod = "am";

      if (start >= 12) {
        start = start - 12;
        start_tod = "pm";
      }
      if (end >= 12) {
        end = end - 12;
        end_tod = "pm";
      }

      checkable[i].checked = true;
      s[i].value = start;
      st[i].value = start_tod;
      e[i].value = end;
      et[i].value = end_tod;
    }
  }
  console.log("Succesfully loaded content");
}
