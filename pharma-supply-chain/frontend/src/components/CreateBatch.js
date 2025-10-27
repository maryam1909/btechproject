import React, { useState } from 'react';
import { ethers } from 'ethers';
import { PARTICIPANTS } from '../utils/participants';
import { useNavigate } from 'react-router-dom';

const CreateBatch = ({ contract, account }) => {
  const [formData, setFormData] = useState({
    batchID: '',
    drugName: '',
    mfgDate: '',
    expiryDate: '',
    quantity: '',
    qaCertificate: null
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      qaCertificate: e.target.files[0]
    }));
  };

  const uploadToIPFS = async (file) => {
    // In a real application, you would upload to IPFS here
    // For now, we'll simulate with a mock IPFS hash
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`QmMockIPFSHash${Date.now()}`);
      }, 1000);
    });
  };

  const createMetadata = () => {
    return {
      name: `Pharma Batch: ${formData.batchID}`,
      description: `Pharmaceutical batch ${formData.batchID}`,
      image: "https://via.placeholder.com/300x300?text=Pharma+Batch",
      attributes: [
        {
          trait_type: "Drug Name",
          value: formData.drugName
        },
        {
          trait_type: "Manufacturing Date",
          value: formData.mfgDate
        },
        {
          trait_type: "Expiry Date",
          value: formData.expiryDate
        },
        {
          trait_type: "Quantity",
          value: formData.quantity
        },
        {
          trait_type: "Batch ID",
          value: formData.batchID
        }
      ]
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!contract) {
      setMessage('Contract not connected');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      // Preflight: ensure Polygon Amoy and manufacturer role
      const provider = new ethers.BrowserProvider(window.ethereum);
      const net = await provider.getNetwork();
      if (Number(net.chainId) !== 80002) {
        setMessage('Please switch MetaMask to Polygon Amoy (chainId 80002) and try again.');
        setLoading(false);
        return;
      }

      try {
        const signer = await provider.getSigner();
        const signerAddr = (await signer.getAddress()).toLowerCase();
        const requiredMfg = (PARTICIPANTS?.MANUFACTURER || '').toLowerCase();
        if (requiredMfg && signerAddr !== requiredMfg) {
          setMessage(`Wrong account connected. Connect Manufacturer ${PARTICIPANTS.MANUFACTURER}`);
          setLoading(false);
          return;
        }
        const isMfg = await contract.isManufacturer(signerAddr);
        if (!isMfg) {
          setMessage('Your wallet is not registered as Manufacturer on this deployment. Ask owner to register.');
          setLoading(false);
          return;
        }
      } catch (_) {}

      // Create metadata
      const metadata = createMetadata();
      const metadataJSON = JSON.stringify(metadata);
      
      // Upload metadata to IPFS (simulated)
      const metadataHash = await uploadToIPFS(new Blob([metadataJSON]));
      const tokenURI = `https://ipfs.io/ipfs/${metadataHash}`;

      // Upload QA certificate to IPFS (simulated)
      let qaHash = '';
      if (formData.qaCertificate) {
        qaHash = await uploadToIPFS(formData.qaCertificate);
      }

      // Estimate gas and check balance (prefer populateTransaction, fallback to manual encoding)
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      // Minimal balance check (0.05 MATIC)
      try {
        const bal = await provider.getBalance(addr);
        if (bal < ethers.parseEther('0.02')) {
          setMessage('Insufficient MATIC on Polygon Amoy (need ~0.02+). Please top-up from faucet and retry.');
          setLoading(false);
          return;
        }
      } catch (_) {}
      let estGas = null;
      try {
        if (contract.populateTransaction && contract.populateTransaction.mintBatch) {
          const txReq = await contract.populateTransaction.mintBatch(tokenURI, formData.batchID);
          estGas = await signer.estimateGas({ ...txReq, from: addr });
        } else {
          // Fallback: encode function data and estimate via provider
          if (contract.interface && contract.interface.getFunction && contract.interface.getFunction('mintBatch')) {
            const data = contract.interface.encodeFunctionData('mintBatch', [tokenURI, formData.batchID]);
            const to = await contract.getAddress();
            estGas = await provider.estimateGas({ from: addr, to, data });
          } else {
            // As a last resort, skip estimation and let the node/MetaMask estimate
            estGas = null;
          }
        }
      } catch (err) {
        // Best-effort: continue without local estimate
        estGas = null;
      }
      // Skip fee preflight to avoid provider RPC incompatibilities

      // Static call to catch potential reverts with a readable reason
      try {
        if (contract.mintBatch && contract.mintBatch.staticCall) {
          await contract.mintBatch.staticCall(tokenURI, formData.batchID);
        }
      } catch (simErr) {
        const reason = (simErr?.shortMessage || simErr?.info?.error?.message || simErr?.message || '').toLowerCase();
        const isGenericProviderIssue = reason.includes('missing revert data') || reason.includes('call exception') || reason.includes('internal json-rpc error');
        const isAuthOrInvalid = reason.includes('unauthorized') || reason.includes('only') || reason.includes('invalid');
        if (!isGenericProviderIssue || isAuthOrInvalid) {
          setMessage(`Transaction would revert: ${simErr?.shortMessage || simErr?.info?.error?.message || simErr?.message || 'Unknown error'}`);
          setLoading(false);
          return;
        }
        // Otherwise continue; let the node estimate/send the tx
      }

      // Mint the parent NFT with retry strategy
      let tx;
      try {
        const overrides = {};
        if (estGas) overrides.gasLimit = estGas + (estGas / 5n);
        tx = await contract.mintBatch(tokenURI, formData.batchID, overrides);
        await tx.wait();
      } catch (sendErr) {
        // Retry with legacy gas price if provider hiccups (-32603)
        try {
          const gp = await provider.send('eth_gasPrice', []);
          const legacyOverrides = { gasPrice: gp ? ethers.toBigInt(gp) : undefined };
          tx = await contract.mintBatch(tokenURI, formData.batchID, legacyOverrides);
          await tx.wait();
        } catch (sendErr2) {
          throw sendErr2;
        }
      }

      // Determine newly minted parent tokenId (tokenCounter incremented post-mint)
      const current = await contract.tokenCounter();
      const parentId = Number(current) - 1;

      // Mint child batches equal to quantity (if > 0)
      const qty = parseInt(formData.quantity || '0', 10);
      if (qty > 0) {
        try {
          const txChild = await contract.mintChildBatches(parentId, qty, tokenURI);
          await txChild.wait();
        } catch (childErr) {
          try {
            const gp2 = await provider.send('eth_gasPrice', []);
            const legacyOverrides2 = { gasPrice: gp2 ? ethers.toBigInt(gp2) : undefined };
            const txChild2 = await contract.mintChildBatches(parentId, qty, tokenURI, legacyOverrides2);
            await txChild2.wait();
          } catch (childErr2) {
            throw childErr2;
          }
        }
      }

      setMessage('Batch created successfully! Child items linked.');
      
      // Reset form
      setFormData({
        batchID: '',
        drugName: '',
        mfgDate: '',
        expiryDate: '',
        quantity: '',
        qaCertificate: null
      });

      // Navigate to dashboard after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error('Error creating batch:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Create New Batch</h1>
        
        {message && (
          <div className={message.includes('Error') ? 'error' : 'success'}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="batchID">Batch ID *</label>
            <input
              type="text"
              id="batchID"
              name="batchID"
              value={formData.batchID}
              onChange={handleInputChange}
              required
              placeholder="e.g., BATCH2024001"
            />
          </div>

          <div className="form-group">
            <label htmlFor="drugName">Drug Name *</label>
            <input
              type="text"
              id="drugName"
              name="drugName"
              value={formData.drugName}
              onChange={handleInputChange}
              required
              placeholder="e.g., Paracetamol 500mg"
            />
          </div>

          <div className="form-group">
            <label htmlFor="mfgDate">Manufacturing Date *</label>
            <input
              type="date"
              id="mfgDate"
              name="mfgDate"
              value={formData.mfgDate}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="expiryDate">Expiry Date *</label>
            <input
              type="date"
              id="expiryDate"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="quantity">Quantity *</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              required
              placeholder="e.g., 1000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="qaCertificate">QA Certificate (Optional)</label>
            <input
              type="file"
              id="qaCertificate"
              name="qaCertificate"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <small>Upload QA certificate or quality documents</small>
          </div>

          <button 
            type="submit" 
            className="btn btn-success"
            disabled={loading}
          >
            {loading ? 'Creating Batch...' : 'Create Batch'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateBatch;
