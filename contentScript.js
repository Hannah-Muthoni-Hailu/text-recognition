(() => {
  // prevent running twice
  if (window.__areaScreenshotInjected) return;
  window.__areaScreenshotInjected = true;

  let overlay, startX, startY, sel, selecting = false;

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.zIndex = 2147483647; // very front
    overlay.style.cursor = 'crosshair';
    overlay.style.background = 'rgba(0,0,0,0.0)'; // transparent; could dim
    document.documentElement.appendChild(overlay);

    // selection element
    sel = document.createElement('div');
    sel.style.position = 'absolute';
    sel.style.border = '2px dashed #09f';
    sel.style.background = 'rgba(0, 150, 255, 0.12)';
    overlay.appendChild(sel);

    // instruction
    const instr = document.createElement('div');
    instr.textContent = 'Drag to select area — Esc to cancel';
    instr.style.position = 'fixed';
    instr.style.right = '12px';
    instr.style.top = '12px';
    instr.style.padding = '6px 8px';
    instr.style.background = 'rgba(0,0,0,0.6)';
    instr.style.color = 'white';
    instr.style.fontSize = '12px';
    instr.style.borderRadius = '4px';
    overlay.appendChild(instr);
  }

  function removeOverlay() {
    if (overlay) overlay.remove();
    window.removeEventListener('keydown', onKeyDown);
    overlay = null;
    sel = null;
    selecting = false;
    window.__areaScreenshotInjected = false;
  }

  function onMouseDown(e) {
    selecting = true;
    startX = e.clientX;
    startY = e.clientY;
    sel.style.left = startX + 'px';
    sel.style.top = startY + 'px';
    sel.style.width = '0px';
    sel.style.height = '0px';
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (!selecting) return;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    sel.style.left = x + 'px';
    sel.style.top = y + 'px';
    sel.style.width = w + 'px';
    sel.style.height = h + 'px';
    e.preventDefault();
  }

  function onMouseUp(e) {
    if (!selecting) return;
    selecting = false;

    // compute selection relative to page (not just viewport)
    const rect = sel.getBoundingClientRect(); // relative to viewport
    const xInPage = rect.left + window.scrollX;
    const yInPage = rect.top + window.scrollY;
    const width = rect.width;
    const height = rect.height;

    // remove overlay quickly so capture doesn't include overlay
    removeOverlay();

    // Send request to background to capture the visible viewport
    chrome.runtime.sendMessage({ action: 'capture-visible-tab' }, (response) => {
      if (!response || !response.success) {
        alert('Capture failed: ' + (response && response.error));
        return;
      }
      const dataUrl = response.dataUrl;
      cropAndOpen(dataUrl, { left: rect.left, top: rect.top, width, height });
    });

    e.preventDefault();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      removeOverlay();
    }
  }

  function cropAndOpen(dataUrl, viewportRect) {
    // viewportRect: left/top/width/height relative to viewport (client coords)
    const img = new Image();
    img.onload = () => {
      try {
        const dpr = window.devicePixelRatio || 1;
        // captureVisibleTab captures at devicePixelRatio scale in many browsers
        // We'll multiply viewport coords by dpr so cropping matches.
        const sx = Math.round(viewportRect.left * dpr);
        const sy = Math.round(viewportRect.top * dpr);
        const sw = Math.round(viewportRect.width * dpr);
        const sh = Math.round(viewportRect.height * dpr);

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');

        // draw cropped area
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

        // open the result in a new tab
        const outDataUrl = canvas.toDataURL('image/png');
        const w = window.open();
        if (w) {
          // write an image tag
          w.document.write('<html><body style="margin:0"><img src="' + outDataUrl + '" /></body></html>');
          w.document.close();
        } else {
          // fallback: download
          const a = document.createElement('a');
          a.href = outDataUrl;
          a.download = 'screenshot.png';
          a.click();
        }
      } catch (err) {
        console.error('Crop failed', err);
        alert('Cropping failed: ' + err.message);
      }
    };
    img.onerror = (err) => {
      console.error('Image load failed', err);
      alert('Failed to load captured image for cropping.');
    };
    img.src = dataUrl;
  }

  // Listen for the popup message to start selection
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.action === 'start-selection') {
      if (overlay) removeOverlay();
      createOverlay();
      overlay.addEventListener('mousedown', onMouseDown);
      overlay.addEventListener('mousemove', onMouseMove);
      overlay.addEventListener('mouseup', onMouseUp);
      window.addEventListener('keydown', onKeyDown);
      sendResponse({ started: true });
    }
  });

  // In case script is directly executed (injection file executed), also auto-start when run as a script:
  // But better to wait for the explicit message. If you want auto-start, uncomment:
  // chrome.runtime.sendMessage({action: 'start-selection'});
})();
