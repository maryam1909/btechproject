import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import QRScanner from './QRScanner';

const VerifyBatch = ({ contract, account }) => {
  const { tokenId } = useParams();
  const [verificationData, setVerificationData] = useState(null);
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isValid, setIsValid] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [counterfeit, setCounterfeit] = useState(false);
  const [counterfeitReason, setCounterfeitReason] = useState('');

  useEffect(() => {
    if (tokenId && contract) {
      loadBatchDetails();
    }
    // If QR was opened as a link with ?data= base64 payload, decode and prefill
    try {
      const params = new URLSearchParams(window.location.search);
      const dataParam = params.get('data');
      if (dataParam) {
        const json = decodeURIComponent(escape(atob(dataParam)));
        setQrInput(json);
        // defer verify to allow state set
        setTimeout(() => { verifyQRCode().catch(() => {}); }, 0);
      }
    } catch (_) {}
  }, [tokenId, contract]);

  const loadBatchDetails = async () => {
    try {
      setLoading(true);
      const batchDetails = await contract.getBatchDetails(Number(tokenId));
      const owner = await contract.ownerOf(Number(tokenId));
      const role = await contract.getRole(owner);
      const transferHistory = await contract.getTransferHistory(Number(tokenId));
      
      setVerificationData({
        batchDetails,
        owner,
        role: Number(role),
        transferHistory
      });
    } catch (error) {
      console.error('Error loading batch details:', error);
      setMessage('Error loading batch details');
    } finally {
      setLoading(false);
    }
  };

  const onScanDetected = async (text) => {
    try {
      setQrInput(text);
      await verifyQRCode();
    } catch (_) {}
    setShowScanner(false);
  };

  const verifyQRCode = async () => {
    if (!qrInput.trim()) {
      setMessage('Please enter QR code data');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const qrData = JSON.parse(qrInput);
      
      if (!qrData.data || !qrData.signature || !qrData.signer) {
        throw new Error('Invalid QR code format');
      }

      const expectedContract = await contract.getAddress();
      const contractMatch = (qrData.data.contract || '').toLowerCase() === expectedContract.toLowerCase();

      const messageHash = ethers.id(JSON.stringify(qrData.data));
      const recoveredAddress = ethers.verifyMessage(ethers.getBytes(messageHash), qrData.signature);

      const onChainBatch = await contract.getBatchDetails(qrData.data.tokenId);
      const tokenMatch = Number(qrData.data.tokenId) === Number(onChainBatch.tokenId);
      const onChainValid = onChainBatch.batchID === qrData.data.batchId;
      const manufacturerMatch = recoveredAddress.toLowerCase() === onChainBatch.manufacturer.toLowerCase();

      const overallValid = contractMatch && tokenMatch && manufacturerMatch && onChainValid;
      
      setIsValid(overallValid);
      
      if (overallValid) {
        setMessage('✅ Product is AUTHENTIC and verified!');

        // Record scans per workflow
        try {
          // Determine user role from chain
          const role = await contract.getRole(account);
          const r = Number(role);
          if (qrData.data.type === 'parent' && (r === 2 || r === 3)) {
            // Distributor(2) or Retailer(3) scans parent once per role
            try {
              const tx = await contract.recordScan(qrData.data.tokenId);
              await tx.wait();
            } catch (e) {
              // Already scanned for this role - mark as counterfeit if flagged
              setCounterfeitReason('Repeated scan detected for this role');
            }
          } else if (qrData.data.type === 'child') {
            try {
              const tx2 = await contract.recordChildScan(qrData.data.childId);
              await tx2.wait();
            } catch (_) {}
          }
        } catch (_) {}

        // Query counterfeit flag on parent token (for child, check parent linkage later if needed)
        try {
          const tid = qrData.data.tokenId || qrData.data.parentId || Number(tokenId);
          const flagged = await contract.isCounterfeit(Number(tid));
          if (flagged) {
            setCounterfeit(true);
            if (!counterfeitReason) setCounterfeitReason('Batch flagged counterfeit on-chain');
            setMessage('❌ Batch flagged COUNTERFEIT - movement halted');
            setIsValid(false);
          }
        } catch (_) {}
      } else {
        setMessage('❌ Product verification FAILED - possible counterfeit!');
      }

    } catch (error) {
      console.error('Error verifying QR code:', error);
      setMessage(`Error: ${error.message}`);
      setIsValid(false);
    } finally {
      setLoading(false);
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case 1: return 'Manufacturer';
      case 2: return 'Distributor';
      case 3: return 'Retailer';
      case 4: return 'Pharmacy';
      default: return 'Unknown';
    }
  };

  const getRoleClass = (role) => {
    switch (role) {
      case 1: return 'role-manufacturer';
      case 2: return 'role-distributor';
      case 3: return 'role-retailer';
      case 4: return 'role-pharmacy';
      default: return '';
    }
  };

  if (loading && !verificationData) {
    return (
      <div className="container">
        <div className="card">
          <div className="loading">Loading batch details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Verify Batch</h1>
        
        {message && (
          <div className={message.includes('Error') || message.includes('FAILED') ? 'error' : 'success'}>
            {message}
          </div>
        )}

        {verificationData && (
          <div style={{ marginBottom: '30px' }}>
            <h2>Batch Information</h2>
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '4px' }}>
              <p><strong>Batch ID:</strong> {verificationData.batchDetails.batchID}</p>
              <p><strong>Token ID:</strong> {verificationData.batchDetails.tokenId.toString()}</p>
              <p><strong>Current Owner:</strong> {verificationData.owner}</p>
              <p><strong>Current Role:</strong> 
                <span className={`role-badge ${getRoleClass(verificationData.role)}`}>
                  {getRoleName(verificationData.role)}
                </span>
              </p>
              <p><strong>Manufacturing Date:</strong> {new Date(Number(verificationData.batchDetails.timestamp) * 1000).toLocaleString()}</p>
              <p><strong>Manufacturer:</strong> {verificationData.batchDetails.manufacturer}</p>
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="qrInput">QR Code Data</label>
          <textarea
            id="qrInput"
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            placeholder="Paste the QR code data here (JSON format)"
            rows="6"
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button 
            className="btn"
            onClick={verifyQRCode}
            disabled={loading || !qrInput.trim()}
          >
            {loading ? 'Verifying...' : 'Verify QR Code'}
          </button>
          <button 
            className="btn"
            type="button"
            onClick={() => setShowScanner(true)}
          >
            Scan QR with Camera
          </button>
        </div>

        {showScanner && (
          <QRScanner onDetected={onScanDetected} onClose={() => setShowScanner(false)} />
        )}

        {isValid !== null && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h2>Verification Result</h2>
            <div className={isValid ? 'status-verified' : 'status-invalid'}>
              {isValid ? '✅ AUTHENTIC PRODUCT' : '❌ COUNTERFEIT DETECTED'}
            </div>
            
            {isValid && (
              <div style={{ marginTop: '15px' }}>
                <h3>Supply Chain History</h3>
                <div className="transfer-history">
                  {(verificationData && Array.isArray(verificationData.transferHistory) ? verificationData.transferHistory : []).map((record, index) => (
                    <div key={index} className="transfer-record">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>Step {index + 1}:</strong> {getRoleName(Number(record.fromRole))} → {getRoleName(Number(record.toRole))}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          {new Date(Number(record.timestamp) * 1000).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                        From: {record.from} → To: {record.to}
                      </div>
                    </div>
                  ))}
                  {(!verificationData || !Array.isArray(verificationData.transferHistory)) && (
                    <div style={{ fontSize: '14px', color: '#666' }}>No transfer history available.</div>
                  )}
                </div>
              </div>
            )}
            {counterfeit && (
              <div className="error" style={{ marginTop: '12px' }}>
                This batch has been flagged as counterfeit. {counterfeitReason}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '30px', padding: '15px', background: '#e9ecef', borderRadius: '4px' }}>
          <h3>How to Verify:</h3>
          <ol>
            <li>Scan the QR code on the pharmaceutical product</li>
            <li>Copy the QR code data (JSON format)</li>
            <li>Paste it in the text area above</li>
            <li>Click "Verify QR Code" to check authenticity</li>
          </ol>
          <p><strong>Note:</strong> The system verifies both the digital signature and on-chain data to ensure authenticity.</p>
        </div>
      </div>
    </div>
  );
};

export default VerifyBatch;
