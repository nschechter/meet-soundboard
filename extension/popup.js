document.getElementById("open").addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { type: "toggle-soundboard" });
    window.close();
  } catch {
    document.getElementById("message").textContent = "Open or reload a Google Meet or Teams web meeting tab, then try again.";
  }
});
