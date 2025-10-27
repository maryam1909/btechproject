import React, { useState, useEffect } from 'react';

const LinkBatch = ({ contract, account }) => {
  const [userBatches, setUserBatches] = useState([]);
  const [parentBatch, setParentBatch] = useState(null);
  const [childBatch, setChildBatch] = useState(null);
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
            
            // Only show batches from the same manufacturer
            if (batchDetails.manufacturer.toLowerCase() === account.toLowerCase()) {
              batches.push({
                tokenId: i,
                batchID: batchDetails.batchID,
                metadataURI: batchDetails.metadataURI
              });
            }
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

  const handleLinkBatches = async () => {
    if (!parentBatch || !childBatch) {
      setMessage('Please select both parent and child batches');
      return;
    }

    if (parentBatch === childBatch) {
      setMessage('Parent and child batches cannot be the same');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      // Check if child batch is already linked to a parent
      const existingParent = await contract.getParentBatch(childBatch);
      if (Number(existingParent) !== 0) {
        throw new Error('Child batch is already linked to another parent');
      }

      // Link the batches
      const tx = await contract.linkChildBatch(parentBatch, childBatch);
      await tx.wait();

      setMessage('Batches linked successfully!');
      
      // Reset form
      setParentBatch(null);
      setChildBatch(null);

    } catch (error) {
      console.error('Error linking batches:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadChildBatches = async (parentId) => {
    try {
      const childBatches = await contract.getChildBatches(parentId);
      return childBatches.map(id => Number(id));
    } catch (error) {
      console.error('Error loading child batches:', error);
      return [];
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Link Batches</h1>
        
        {message && (
          <div className={message.includes('Error') ? 'error' : 'success'}>
            {message}
          </div>
        )}

        {loading && (
          <div className="loading">Loading...</div>
        )}

        <div className="form-group">
          <label htmlFor="parentBatch">Parent Batch</label>
          <select
            id="parentBatch"
            value={parentBatch || ''}
            onChange={(e) => setParentBatch(Number(e.target.value))}
            disabled={loading}
          >
            <option value="">Choose parent batch...</option>
            {userBatches.map((batch) => (
              <option key={batch.tokenId} value={batch.tokenId}>
                {batch.batchID} (Token #{batch.tokenId})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="childBatch">Child Batch</label>
          <select
            id="childBatch"
            value={childBatch || ''}
            onChange={(e) => setChildBatch(Number(e.target.value))}
            disabled={loading}
          >
            <option value="">Choose child batch...</option>
            {userBatches
              .filter(batch => batch.tokenId !== parentBatch)
              .map((batch) => (
                <option key={batch.tokenId} value={batch.tokenId}>
                  {batch.batchID} (Token #{batch.tokenId})
                </option>
              ))}
          </select>
        </div>

        {userBatches.length === 0 && !loading && (
          <div className="info">
            No batches found. Create batches first to link them.
          </div>
        )}

        <button 
          className="btn"
          onClick={handleLinkBatches}
          disabled={!parentBatch || !childBatch || loading}
        >
          {loading ? 'Linking...' : 'Link Batches'}
        </button>

        {parentBatch && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>Parent Batch Details</h3>
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '4px' }}>
              <p><strong>Batch ID:</strong> {userBatches.find(b => b.tokenId === parentBatch)?.batchID}</p>
              <p><strong>Token ID:</strong> {parentBatch}</p>
            </div>
          </div>
        )}

        {childBatch && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>Child Batch Details</h3>
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '4px' }}>
              <p><strong>Batch ID:</strong> {userBatches.find(b => b.tokenId === childBatch)?.batchID}</p>
              <p><strong>Token ID:</strong> {childBatch}</p>
            </div>
          </div>
        )}

        <div style={{ marginTop: '30px', padding: '15px', background: '#e9ecef', borderRadius: '4px' }}>
          <h3>Batch Linking Rules:</h3>
          <ul>
            <li>Only manufacturers can link batches</li>
            <li>Both batches must be owned by the same manufacturer</li>
            <li>A child batch can only be linked to one parent</li>
            <li>Parent-child relationships help track sub-batches and lot numbers</li>
            <li>This is useful for multi-lot manufacturing scenarios</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LinkBatch;
