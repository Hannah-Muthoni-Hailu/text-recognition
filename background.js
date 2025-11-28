chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === 'capture-visible-tab') {
    // captureVisibleTab returns a dataURL of the visible viewport
    chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      // Return the captured dataUrl back to the content script
      sendResponse({ success: true, dataUrl });
    });
    // indicate we will respond asynchronously
    return true;
  }
});
