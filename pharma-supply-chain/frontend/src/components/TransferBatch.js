import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { PARTICIPANTS } from '../utils/participants';

const TransferBatch = ({ contract, account }) => {
  const [userBatches, setUserBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  // Address will be derived from selected role
  const [recipientRoleSelect, setRecipientRoleSelect] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentRoleNum, setCurrentRoleNum] = useState(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [isCounterfeit, setIsCounterfeit] = useState(false);

  // (moved below loadUserBatches)

  // Load current role and scan/counterfeit flags when selection changes
  useEffect(() => {
    const fetchFlags = async () => {
      try {
        if (!contract || !selectedBatch) return;
        // Determine current role from on-chain batch details
        const bd = await contract.getBatchDetails(selectedBatch);
        const role = Number(bd.currentRole);
        setCurrentRoleNum(role);
        // Check scan status for this role (public mapping)
        try {
          const scanned = await contract.scannedByRole(selectedBatch, role);
          setHasScanned(Boolean(scanned));
        } catch (_) { setHasScanned(false); }
        // Check counterfeit flag
        try {
          const cf = await contract.isCounterfeit(selectedBatch);
          setIsCounterfeit(Boolean(cf));
        } catch (_) { setIsCounterfeit(false); }
      } catch (_) {
        setHasScanned(false);
        setIsCounterfeit(false);
      }
    };
    fetchFlags();
  }, [contract, selectedBatch]);

  const loadUserBatches = useCallback(async () => {
    try {
      setLoading(true);
      const tokenCounter = await contract.tokenCounter();
      const batches = [];
      
      for (let i = 1; i < Number(tokenCounter); i++) {
        try {
          const owner = await contract.ownerOf(i);
          const parent = await contract.getParentBatch(i);
          if (owner.toLowerCase() === account.toLowerCase() && Number(parent) === 0) {
            const batchDetails = await contract.getBatchDetails(i);
            batches.push({
              tokenId: i,
              batchID: batchDetails.batchID,
              currentRole: Number(batchDetails.currentRole),
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
  }, [contract, account]);

  // Load user batches when contract changes
  useEffect(() => {
    if (contract) {
      loadUserBatches();
    }
  }, [contract, loadUserBatches]);

  const handleTransfer = async () => {
    if (!selectedBatch) {
      setMessage('Please select a parent batch');
      return;
    }
    if (!recipientRoleSelect) {
      setMessage('Please select the recipient role');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      // Map role to known participant address
      const recipientAddress = recipientRoleSelect === 'Distributor'
        ? PARTICIPANTS.DISTRIBUTOR
        : recipientRoleSelect === 'Retailer'
          ? PARTICIPANTS.RETAILER
          : recipientRoleSelect === 'Manufacturer'
            ? PARTICIPANTS.MANUFACTURER
            : '';
      if (!recipientAddress) throw new Error('Unknown recipient role');

      // Verify sender owns the selected parent
      const owner = await contract.ownerOf(selectedBatch);
      if (owner.toLowerCase() !== account.toLowerCase()) {
        throw new Error('You are not the current owner of this parent batch');
      }

      // Check if recipient has a role assigned
      const recipientRole = await contract.getRole(recipientAddress);
      const recipientRoleNum = Number(recipientRole);
      if (recipientRoleNum === 0) {
        throw new Error('Recipient does not have a role assigned');
      }

      // Get current batch details
      const batchDetails = await contract.getBatchDetails(selectedBatch);
      const currentRole = Number(batchDetails.currentRole);
      const nextRole = recipientRoleNum;

      // Validate selected role matches recipient actual role
      const selectedRoleNum = recipientRoleSelect === 'Distributor' ? 2
        : recipientRoleSelect === 'Retailer' ? 3
        : recipientRoleSelect === 'Pharmacy' ? 4
        : recipientRoleSelect === 'Manufacturer' ? 1
        : 0;
      if (selectedRoleNum === 0 || selectedRoleNum !== nextRole) {
        throw new Error('Selected recipient role does not match the recipient address role');
      }

      // Validate transfer sequence per new rules
      const validTransfer = (
        (currentRole === 1 && (nextRole === 2 || nextRole === 3)) || // Manufacturer → Distributor or Retailer
        (currentRole === 2 && nextRole === 3) || // Distributor → Retailer
        (currentRole === 3 && nextRole === 4)    // Retailer → Pharmacy
      );

      if (!validTransfer) {
        throw new Error('Invalid transfer sequence. Check role requirements.');
      }

      // Block if counterfeit or not scanned (UI guard; contract also enforces)
      if (isCounterfeit) throw new Error('This batch is flagged counterfeit. Transfer is blocked.');
      // Manufacturer does not need to scan; others must
      if (currentRoleNum === 1 ? false : !hasScanned) {
        throw new Error('Scan required before transfer. Open Verify and scan the QR first.');
      }

      // Preflight: static call to surface revert reasons before prompting MetaMask
      try {
        if (contract.transferParentAndChildren && contract.transferParentAndChildren.staticCall) {
          await contract.transferParentAndChildren.staticCall(selectedBatch, recipientAddress);
        } else if (contract.transferBatch && contract.transferBatch.staticCall) {
          await contract.transferBatch.staticCall(selectedBatch, recipientAddress);
        }
      } catch (simErr) {
        const reason = (simErr?.shortMessage || simErr?.info?.error?.message || simErr?.message || '').toLowerCase();
        const isGenericProviderIssue = reason.includes('missing revert data') || reason.includes('call exception') || reason.includes('internal json-rpc error');
        const isAuthOrInvalid = reason.includes('unauthorized') || reason.includes('only') || reason.includes('invalid') || reason.includes('counterfeit') || reason.includes('scan required') || reason.includes('invalid transfer');
        if (!isGenericProviderIssue || isAuthOrInvalid) {
          throw new Error(`Transaction would revert: ${simErr?.shortMessage || simErr?.info?.error?.message || simErr?.message || 'Unknown error'}`);
        }
        // Otherwise continue; let the node estimate/send the tx
      }

      // Minimal balance check (~0.02 MATIC)
      try {
        const provider = contract.runner?.provider;
        const signerAddr = account;
        if (provider && signerAddr) {
          const bal = await provider.getBalance(signerAddr);
          if (bal < 20000000000000000n) { // 0.02
            throw new Error('Insufficient MATIC on Polygon Amoy (need ~0.02+). Please top-up and retry.');
          }
        }
      } catch (bErr) {
        if (bErr?.message?.includes('Insufficient MATIC')) throw bErr;
      }

      // Execute bulk transfer with retry strategy (legacy gasPrice)
      const provider = contract.runner?.provider;
      const sendWithRetry = async (fn, args) => {
        try {
          const tx = await fn(...args);
          await tx.wait();
          return;
        } catch (sendErr) {
          if (!provider) throw sendErr;
          try {
            let legacyOverrides;
            try {
              const gp = await provider.send('eth_gasPrice', []);
              legacyOverrides = { gasPrice: gp ? ethers.toBigInt(gp) : undefined };
            } catch (gpErr) {
              // If rate limited (-32005), fallback to a conservative static gas price
              const msg = (gpErr?.message || '').toLowerCase();
              if (msg.includes('rate limited') || msg.includes('-32005')) {
                legacyOverrides = { gasPrice: ethers.parseUnits('30', 'gwei') };
              } else {
                // Unknown failure fetching gas price: try without overrides
                legacyOverrides = undefined;
              }
            }
            const tx2 = legacyOverrides ? await fn(...[...args, legacyOverrides]) : await fn(...args);
            await tx2.wait();
            return;
          } catch (sendErr2) {
            throw sendErr2;
          }
        }
      };

      if (contract.transferParentAndChildren) {
        await sendWithRetry(contract.transferParentAndChildren, [selectedBatch, recipientAddress]);
      } else {
        await sendWithRetry(contract.transferBatch, [selectedBatch, recipientAddress]);
        try {
          const children = await contract.getChildBatches(selectedBatch);
          for (let i = 0; i < Number(children.length); i++) {
            const childId = Number(children[i]);
            await sendWithRetry(contract.transferBatch, [childId, recipientAddress]);
          }
        } catch (_) {}
      }

      setMessage('Batch transferred successfully!');
      
      // Reset form
      setSelectedBatch(null);
      
      // Reload batches
      await loadUserBatches();

    } catch (error) {
      console.error('Error transferring batch:', error);
      setMessage(`Error: ${error.message}`);
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

  const getNextRoles = (currentRole) => {
    switch (currentRole) {
      case 1: return ['Distributor', 'Retailer'];
      case 2: return ['Retailer'];
      case 3: return ['Pharmacy'];
      default: return [];
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Transfer Batch</h1>
        
        {message && (
          <div className={message.includes('Error') ? 'error' : 'success'}>
            {message}
          </div>
        )}

        {loading && (
          <div className="loading">Loading...</div>
        )}

        <div className="form-group">
          <label htmlFor="batchSelect">Select Batch to Transfer</label>
          <select
            id="batchSelect"
            value={selectedBatch || ''}
            onChange={(e) => setSelectedBatch(Number(e.target.value))}
            disabled={loading}
          >
            <option value="">Choose a batch...</option>
            {userBatches.map((batch) => (
              <option key={batch.tokenId} value={batch.tokenId}>
                {batch.batchID} (Token #{batch.tokenId}) - Current: {getRoleName(batch.currentRole)}
              </option>
            ))}
          </select>
        </div>

        {userBatches.length === 0 && !loading && (
          <div className="info">
            No batches found that you can transfer.
          </div>
        )}

        <div className="form-group">
          <label htmlFor="recipientRole">Recipient Role</label>
          <select
            id="recipientRole"
            value={recipientRoleSelect}
            onChange={(e) => setRecipientRoleSelect(e.target.value)}
            disabled={loading}
          >
            <option value="">Choose role...</option>
            {selectedBatch && getNextRoles(userBatches.find(b => b.tokenId === selectedBatch)?.currentRole).map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {selectedBatch && (
          <div className="info" style={{ marginBottom: '10px' }}>
            <div>
              <strong>Scan status:</strong> {currentRoleNum === 1 ? 'Manufacturer: scan not required' : (hasScanned ? 'Verified for your role' : 'Scan required')}
            </div>
            {isCounterfeit && (
              <div className="error" style={{ marginTop: 6 }}>This batch is flagged counterfeit due to repeated scans. Transfers are blocked.</div>
            )}
            {currentRoleNum !== 1 && !hasScanned && !isCounterfeit && (
              <div style={{ marginTop: 6 }}>
                <a className="btn" href={`/verify/${selectedBatch}`} target="_blank" rel="noreferrer">Open Verify to Scan</a>
              </div>
            )}
          </div>
        )}

        <button 
          className="btn"
          onClick={handleTransfer}
          disabled={!selectedBatch || !recipientRoleSelect || loading || (currentRoleNum !== 1 && !hasScanned) || isCounterfeit}
        >
          {loading ? 'Transferring...' : 'Transfer Batch'}
        </button>

        <div style={{ marginTop: '30px', padding: '15px', background: '#e9ecef', borderRadius: '4px' }}>
          <h3>Transfer Rules:</h3>
          <ul>
            <li><strong>Manufacturer</strong> can transfer to <strong>Distributor</strong> or <strong>Retailer</strong></li>
            <li><strong>Distributor</strong> can only transfer to <strong>Retailer</strong></li>
            <li><strong>Retailer</strong> can only transfer to <strong>Pharmacy</strong></li>
            <li>Recipient must have the appropriate role assigned</li>
            <li>Only the current owner can transfer the batch</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TransferBatch;
