const chatbox = document.getElementById("chatbox");
const input = document.getElementById("message");
const sendBtn = document.getElementById("send-btn");
const token = document.getElementById("token").value;
const chatId = document.getElementById("chatId");
sendBtn.addEventListener("click", function () {
  const data = {
    token: token,
    chatId: chatId.value,
    message: input.value,
  };
  console.log(JSON.stringify(data));
  fetch("/chat", {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then(async (data) => {
      await updateChat();
      input.value = "";
      chatbox.scrollTop = chatbox.scrollHeight;
      console.log(data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});

async function updateChat() {
  await fetch(`/updateChat/${chatId.value}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json(); // Assuming the response is in JSON format
    })
    .then((data) => {
      chatbox.innerHTML = "";
      for (const msg of data.chat) {
        const li = document.createElement("li");
        if (data.primary === msg.id) {
          li.className = "list-group-item pb-0";
          li.innerHTML = `<p><strong class="text-success">${msg.name}:</strong> ${msg.message}</p>`;
        } else {
          li.className = "list-group-item pb-0";
          li.innerHTML = `<p><strong >${msg.name}:</strong> ${msg.message}</p>`;
        }

        chatbox.appendChild(li);
      }

      console.log(data);
    })
    .catch((error) => {
      // Handle any errors, e.g., display an error message
      console.error("Error:", error);
    });
}

setInterval(updateChat, 5 * 1000);
