/* QR Pass Rendering & Camera Scanning Helpers */
(function () {
  async function renderQrToCanvas(canvas, text, size) {
    if (!canvas) return false;
    const px = size || 220;
    if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
      await window.QRCode.toCanvas(canvas, String(text || ''), {
        width: px,
        margin: 2,
        color: { dark: '#101b2b', light: '#ffffff' }
      });
      return true;
    }
    return false;
  }

  function createScanner(elementId, onScanSuccess, onScanError) {
    let instance = null;
    let active = false;

    async function start() {
      if (active) return { ok: true };
      if (typeof window.Html5Qrcode !== 'function') {
        return { ok: false, msg: 'QR scanner library failed to load. Use manual code check-in below.' };
      }
      try {
        instance = new window.Html5Qrcode(elementId);
        await instance.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          function (decodedText) {
            if (typeof onScanSuccess === 'function') onScanSuccess(decodedText);
          },
          function (errMsg) {
            if (typeof onScanError === 'function') onScanError(errMsg);
          }
        );
        active = true;
        return { ok: true };
      } catch (err) {
        active = false;
        return { ok: false, msg: (err && err.message) || 'Camera access denied or unavailable.' };
      }
    }

    async function stop() {
      if (!instance || !active) return;
      try {
        await instance.stop();
        await instance.clear();
      } catch (_err) {
        // Ignore cleanup errors
      }
      active = false;
    }

    return {
      start: start,
      stop: stop,
      isActive: function () { return active; }
    };
  }

  window.NCCQr = {
    renderQrToCanvas: renderQrToCanvas,
    createScanner: createScanner
  };
})();
