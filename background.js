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

      // } catch (err) {
      //   console.error("Upload error:", err);
      // }
      // const serverData = await uploadRes.json(); // assuming server returns JSON
        const serverData = "/response.json"

        // Send server response back to sender (popup or content script)
        if (sender.tab) {
          // If message came from a content script
          chrome.tabs.sendMessage(sender.tab.id, { action: 'upload-complete', serverData });
        } else {
          // If message came from popup
          chrome.runtime.sendMessage({ action: 'upload-complete', serverData });
        }

      } catch (err) {
        console.error("Upload error:", err);
        if (sender.tab) {
          chrome.tabs.sendMessage(sender.tab.id, { action: 'upload-error', error: err.message });
        } else {
          chrome.runtime.sendMessage({ action: 'upload-error', error: err.message });
        }
      }
      // Return the captured dataUrl back to the content script
    //   sendResponse({ success: true, dataUrl });
    });
    // indicate we will respond asynchronously
    return true;
  }
});
