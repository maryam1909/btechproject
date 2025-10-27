import React, { useEffect, useRef, useState } from 'react';

const QRScanner = ({ onDetected, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState(false);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    let stream;
    const start = async () => {
      try {
        if ('BarcodeDetector' in window) {
          const formats = ['qr_code'];
          // eslint-disable-next-line no-undef
          detectorRef.current = new window.BarcodeDetector({ formats });
        } else {
          setError('QR scanning not supported by this browser. Use Paste mode or try a modern Chromium-based browser.');
        }

        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setActive(true);
          tick();
        }
      } catch (e) {
        setError(`Camera error: ${e.message}`);
      }
    };

    const tick = async () => {
      if (!videoRef.current || !canvasRef.current || !active) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (detectorRef.current) {
        try {
          const bitmap = await createImageBitmap(canvas);
          const codes = await detectorRef.current.detect(bitmap);
          if (codes && codes.length > 0) {
            const text = codes[0].rawValue || codes[0].rawValue || '';
            if (text) {
              onDetected(text);
              stop();
              return;
            }
          }
        } catch (_) {
          // ignore per-frame errors
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const stop = () => {
      setActive(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      if (onClose) onClose();
    };

    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '90%', maxWidth: 600, background: '#111', borderRadius: 8, padding: 12, color: '#fff', position: 'relative' }}>
        <button className="btn btn-danger" onClick={onClose} style={{ position: 'absolute', right: 12, top: 12 }}>Close</button>
        <h2 style={{ margin: '0 0 8px' }}>Scan QR</h2>
        {error && <div className="error" style={{ marginBottom: 8 }}>{error}</div>}
        <div style={{ position: 'relative' }}>
          <video ref={videoRef} style={{ width: '100%', borderRadius: 6 }} muted playsInline />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(0,255,0,0.6)', margin: 20, borderRadius: 8 }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#ccc' }}>
          Align the QR within the frame. If scanning is unsupported, paste the QR JSON manually.
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
