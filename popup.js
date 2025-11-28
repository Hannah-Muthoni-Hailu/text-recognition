document.getElementById('start').addEventListener('click', async () => {
  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  // Inject the content script into the page (grants it the ability to run)
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['contentScript.js']
    });
    // Tell the content script to start selection
    chrome.tabs.sendMessage(tab.id, { action: 'start-selection' });
    window.close(); // close popup (optional)
  } catch (err) {
    console.error('Injection failed', err);
    alert('Could not inject selection script. Try again.');
  }
});
