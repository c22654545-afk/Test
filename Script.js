document.getElementById("feedback-form")?.addEventListener("submit", async function(e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const feedback = document.getElementById("feedback-text").value.trim();
  const statusDiv = document.getElementById("feedback-status");

  if (!name || !email || !feedback) {
    statusDiv.textContent = "⚠️ Please fill out all fields.";
    statusDiv.classList.remove("hidden");
    return;
  }

  document.getElementById("submit-text").style.display = "none";
  document.getElementById("loading").classList.remove("hidden");

  try {
    // Send message to Discord webhook
    const response = await fetch(CONFIG.WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "📩 New Feedback Received",
            color: 0x667eea,
            fields: [
              { name: "👤 Name", value: name, inline: true },
              { name: "📧 Email", value: email, inline: true },
              { name: "💬 Feedback", value: feedback }
            ],
            footer: { text: "Portfolio Feedback Bot ☁️" },
            timestamp: new Date()
          }
        ]
      })
    });

    if (response.ok) {
      statusDiv.textContent = "✅ Feedback sent successfully!";
    } else {
      statusDiv.textContent = "❌ Failed to send feedback.";
    }
  } catch (err) {
    statusDiv.textContent = "⚠️ Error sending feedback.";
  }

  document.getElementById("submit-text").style.display = "inline";
  document.getElementById("loading").classList.add("hidden");
  statusDiv.classList.remove("hidden");
  this.reset();
});
