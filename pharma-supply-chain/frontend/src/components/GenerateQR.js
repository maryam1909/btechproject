import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { ethers } from 'ethers';
import ipfs from '../utils/ipfs';

const GenerateQR = ({ contract, account }) => {
  const [userBatches, setUserBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [childQRs, setChildQRs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (contract) {
      loadUserBatches();
    }
  }, [contract]);

  const loadUserBatches = async () => {
    try {
      setLoading(true);
      const tokenCounter = await contract.tokenCounter();
      const batches = [];
      
      for (let i = 1; i < Number(tokenCounter); i++) {
        try {
          const owner = await contract.ownerOf(i);
          if (owner.toLowerCase() === account.toLowerCase()) {
            const batchDetails = await contract.getBatchDetails(i);
            batches.push({
              tokenId: i,
              batchID: batchDetails.batchID,
              metadataURI: batchDetails.metadataURI
            });
          }
        } catch (error) {
          // Token doesn't exist
        }
      }
      
      setUserBatches(batches);
    } catch (error) {
      console.error('Error loading user batches:', error);
      setMessage('Error loading batches');
    } finally {
      setLoading(false);
    }
  };

  const downloadChildQR = (index) => {
    const canvas = document.getElementById(`qr-code-child-${index}`);
    if (canvas) {
      const link = document.createElement('a');
      link.download = `child-qr-${index}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const generateQR = async () => {
    if (!selectedBatch) {
      setMessage('Please select a batch');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      // Get batch details
      const batchDetails = await contract.getBatchDetails(selectedBatch);
      
      // Resolve base URL for mobile scanning (prefer HTTPS via env)
      const baseUrl = (process.env.REACT_APP_PUBLIC_BASE_URL && process.env.REACT_APP_PUBLIC_BASE_URL.startsWith('http'))
        ? process.env.REACT_APP_PUBLIC_BASE_URL
        : window.location.origin;

      // Create Parent QR payload
      const payload = {
        type: 'parent',
        batchId: batchDetails.batchID,
        tokenId: selectedBatch,
        contract: await contract.getAddress(),
        verifyUrl: `${baseUrl}/verify/${selectedBatch}`,
        timestamp: Date.now()
      };

      // Sign the payload with the user's private key
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const messageHash = ethers.id(JSON.stringify(payload));
      const signature = await signer.signMessage(ethers.getBytes(messageHash));

      // Create final Parent QR data
      const qrPayload = {
        data: payload,
        signature: signature,
        signer: account
      };

      // Optionally upload QR payload to IPFS for reference
      let ipfsRef = null;
      try {
        const upload = await ipfs.uploadMetadata(qrPayload);
        ipfsRef = upload.url;
      } catch (e) {
        // Non-fatal: continue without IPFS URL
      }

      // Build URL with base64-encoded payload for easy scanning on mobile
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(qrPayload))));
      const scanUrl = `${baseUrl}/verify?data=${encoded}`;
      setQrData({ ...qrPayload, ipfsUrl: ipfsRef, scanUrl });

      // Build Child QRs for all linked child tokens
      const children = await contract.getChildBatches(selectedBatch);
      // Try to enrich payload with metadata JSON (optional)
      let metaJson = null;
      try {
        if (batchDetails.metadataURI) {
          const r = await fetch(batchDetails.metadataURI);
          if (r.ok) metaJson = await r.json();
        }
      } catch (_) {}
      const childList = [];
      for (let i = 0; i < children.length; i++) {
        const cid = Number(children[i]);
        const cPayload = {
          type: 'child',
          parentId: selectedBatch,
          childId: cid,
          contract: await contract.getAddress(),
          verifyUrl: `${baseUrl}/verify/${cid}`,
          timestamp: Date.now()
        };
        // Enrich with metadata fields for child QR
        if (metaJson) {
          cPayload.drugName = metaJson?.attributes?.find?.(a => a.trait_type === 'Drug Name')?.value || '';
          cPayload.mfgDate = metaJson?.attributes?.find?.(a => a.trait_type === 'Manufacturing Date')?.value || '';
          cPayload.expiryDate = metaJson?.attributes?.find?.(a => a.trait_type === 'Expiry Date')?.value || '';
        }
        cPayload.manufacturer = batchDetails.manufacturer;
        cPayload.parentTimestamp = Number(batchDetails.timestamp);
        const cHash = ethers.id(JSON.stringify(cPayload));
        const cSig = await signer.signMessage(ethers.getBytes(cHash));
        const childQR = { data: cPayload, signature: cSig, signer: account };
        try {
          const up = await ipfs.uploadMetadata(childQR);
          const cEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(childQR))));
          const cScanUrl = `${baseUrl}/verify?data=${cEncoded}`;
          childList.push({ ...childQR, ipfsUrl: up.url, scanUrl: cScanUrl });
        } catch (_) {
          const cEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(childQR))));
          const cScanUrl = `${baseUrl}/verify?data=${cEncoded}`;
          childList.push({ ...childQR, scanUrl: cScanUrl });
        }
      }
      setChildQRs(childList);
      setMessage('QR code generated successfully!');

    } catch (error) {
      console.error('Error generating QR:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrData) return;

    const canvas = document.getElementById('qr-code');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `pharma-batch-${qrData.data.batchId}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const copyQRData = () => {
    if (!qrData) return;
    
    navigator.clipboard.writeText(JSON.stringify(qrData, null, 2));
    setMessage('QR data copied to clipboard!');
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Generate QR Code</h1>
        
        {message && (
          <div className={message.includes('Error') ? 'error' : 'success'}>
            {message}
          </div>
        )}

        {loading && (
          <div className="loading">Loading...</div>
        )}

        <div className="form-group">
          <label htmlFor="batchSelect">Select Batch</label>
          <select
            id="batchSelect"
            value={selectedBatch || ''}
            onChange={(e) => setSelectedBatch(Number(e.target.value))}
            disabled={loading}
          >
            <option value="">Choose a batch...</option>
            {userBatches.map((batch) => (
              <option key={batch.tokenId} value={batch.tokenId}>
                {batch.batchID} (Token #{batch.tokenId})
              </option>
            ))}
          </select>
        </div>

        {userBatches.length === 0 && !loading && (
          <div className="info">
            No batches found. Create a batch first to generate QR codes.
          </div>
        )}

        <button 
          className="btn"
          onClick={generateQR}
          disabled={!selectedBatch || loading}
        >
          {loading ? 'Generating...' : 'Generate QR Code'}
        </button>

        {qrData && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h2>Generated QR Code</h2>
            
            <div className="qr-container">
              <QRCode
                id="qr-code"
                value={qrData.scanUrl || JSON.stringify(qrData)}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>

            <div style={{ marginTop: '20px' }}>
              <h3>QR Code Details:</h3>
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '4px', margin: '10px 0' }}>
                <p><strong>Batch ID:</strong> {qrData.data.batchId}</p>
                <p><strong>Token ID:</strong> {qrData.data.tokenId}</p>
                <p><strong>Contract:</strong> {qrData.data.contract}</p>
                <p><strong>Verify URL:</strong> {qrData.data.verifyUrl}</p>
                {qrData.scanUrl && (
                  <p><strong>Scan URL:</strong> <a href={qrData.scanUrl} target="_blank" rel="noreferrer">{qrData.scanUrl}</a></p>
                )}
                {qrData.ipfsUrl && (
                  <p><strong>QR Payload IPFS:</strong> <a href={qrData.ipfsUrl} target="_blank" rel="noreferrer">{qrData.ipfsUrl}</a></p>
                )}
                <p><strong>Signed by:</strong> {qrData.signer}</p>
                <p><strong>Signature:</strong> {qrData.signature.slice(0, 20)}...</p>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button className="btn" onClick={downloadQR}>
                Download QR Code
              </button>
              <button className="btn" onClick={copyQRData}>
                Copy QR Data
              </button>
            </div>
          </div>
        )}

        {childQRs.length > 0 && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h2>Child QR Codes ({childQRs.length})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {childQRs.map((cqr, idx) => (
                <div key={idx} style={{ border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
                  <div className="qr-container">
                    <QRCode
                      id={`qr-code-child-${idx}`}
                      value={cqr.scanUrl || JSON.stringify(cqr)}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    <div><strong>Child ID:</strong> {cqr.data.childId}</div>
                    <div><strong>Parent:</strong> {cqr.data.parentId}</div>
                    {cqr.ipfsUrl && (
                      <div><strong>IPFS:</strong> <a href={cqr.ipfsUrl} target="_blank" rel="noreferrer">link</a></div>
                    )}
                    {cqr.scanUrl && (
                      <div><strong>Scan URL:</strong> <a href={cqr.scanUrl} target="_blank" rel="noreferrer">open</a></div>
                    )}
                  </div>
                  <button className="btn" style={{ marginTop: 8 }} onClick={() => downloadChildQR(idx)}>Download</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateQR;
