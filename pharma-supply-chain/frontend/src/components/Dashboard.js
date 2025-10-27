import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Dashboard = ({ contract, readContract, account, userRole }) => {
  const [stats, setStats] = useState({
    totalBatches: 0,
    myBatches: 0,
    pendingTransfers: 0
  });
  const [recentBatches, setRecentBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contract) {
      loadDashboardData();
    }
  }, [contract, readContract, account]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Helper to tolerate transient RPC/indexer errors
      const sleep = (ms) => new Promise(res => setTimeout(res, ms));
      const safeCall = async (fn, retries = 2, delay = 400) => {
        for (let i = 0; i <= retries; i++) {
          try { return await fn(); } catch (e) {
            if (i === retries) throw e;
            await sleep(delay);
          }
        }
      };

      // Count only parent batches (parentBatch == 0)
      const c = readContract || contract;
      const tokenCounter = await safeCall(() => c.tokenCounter());
      let totalBatches = 0;
      const maxToScan = Math.min(Number(tokenCounter), 200); // cap to avoid long loops
      for (let i = 1; i < maxToScan; i++) {
        try {
          const parent = await safeCall(() => c.getParentBatch(i));
          if (Number(parent) === 0) {
            totalBatches++;
          }
        } catch (_) { /* ignore per-token errors */ }
      }
      
      // Get user's batches (simplified - in real app, you'd track this better)
      const myBatches = await getUserBatches(c);
      
      setStats({
        totalBatches,
        myBatches,
        pendingTransfers: 0 // Would need to implement this logic
      });
      
      // Load recent batches (simplified)
      await loadRecentBatches();
      
    } catch (error) {
      // Best-effort: don't spam console for transient RPC/indexer issues
    } finally {
      setLoading(false);
    }
  };

  const getUserBatches = async (c) => {
    // This is a simplified version - in a real app, you'd track user batches
    try {
      const sleep = (ms) => new Promise(res => setTimeout(res, ms));
      const safeCall = async (fn, retries = 2, delay = 400) => {
        for (let i = 0; i <= retries; i++) {
          try { return await fn(); } catch (e) {
            if (i === retries) throw e;
            await sleep(delay);
          }
        }
      };

      const tokenCounter = await safeCall(() => c.tokenCounter());
      let count = 0;
      
      const maxToScan = Math.min(Number(tokenCounter), 200);
      for (let i = 1; i < maxToScan; i++) {
        try {
          const owner = await safeCall(() => c.ownerOf(i));
          const parent = await safeCall(() => c.getParentBatch(i));
          if (owner.toLowerCase() === account.toLowerCase() && Number(parent) === 0) {
            count++;
          }
        } catch (error) {
          // Token doesn't exist or other error
        }
      }
      
      return count;
    } catch (error) {
      return 0;
    }
  };

  const loadRecentBatches = async () => {
    try {
      const sleep = (ms) => new Promise(res => setTimeout(res, ms));
      const safeCall = async (fn, retries = 2, delay = 400) => {
        for (let i = 0; i <= retries; i++) {
          try { return await fn(); } catch (e) {
            if (i === retries) throw e;
            await sleep(delay);
          }
        }
      };

      const c = readContract || contract;
      const tokenCounter = await safeCall(() => c.tokenCounter());
      const batches = [];
      
      // Get last 5 batches
      const start = Math.max(1, Number(tokenCounter) - 5);
      
      for (let i = start; i < Number(tokenCounter); i++) {
        try {
          const parent = await safeCall(() => c.getParentBatch(i));
          if (Number(parent) !== 0) continue; // skip child batches
          const batchDetails = await safeCall(() => c.getBatchDetails(i));
          const owner = await safeCall(() => c.ownerOf(i));
          const role = await safeCall(() => c.getRole(owner));
          
          batches.push({
            tokenId: i,
            batchID: batchDetails.batchID,
            owner: owner,
            role: Number(role),
            timestamp: Number(batchDetails.timestamp)
          });
        } catch (error) {
          // Token doesn't exist
        }
      }
      
      setRecentBatches(batches.reverse());
    } catch (error) {
      // ignore
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

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <div className="loading">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Dashboard</h1>
      
      <div className="dashboard">
        <div className="dashboard-card">
          <h3>Total Batches</h3>
          <div className="number">{stats.totalBatches}</div>
          <p>Batches in the system</p>
        </div>
        
        <div className="dashboard-card">
          <h3>My Batches</h3>
          <div className="number">{stats.myBatches}</div>
          <p>Batches owned by you</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Pending Transfers</h3>
          <div className="number">{stats.pendingTransfers}</div>
          <p>Awaiting your action</p>
        </div>
      </div>

      <div className="card">
        <h2>Recent Batches</h2>
        {recentBatches.length === 0 ? (
          <p>No batches found.</p>
        ) : (
          <div>
            {recentBatches.map((batch) => (
              <div key={batch.tokenId} className="transfer-record">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Batch ID:</strong> {batch.batchID} (Token #{batch.tokenId})
                  </div>
                  <div>
                    <span className={`role-badge ${getRoleClass(batch.role)}`}>
                      {getRoleName(batch.role)}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                  Owner: {batch.owner.slice(0, 6)}...{batch.owner.slice(-4)}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Created: {new Date(batch.timestamp * 1000).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {(userRole === 1) && (
            <>
              <Link to="/create-batch" className="btn">
                Create New Batch
              </Link>
              <Link to="/generate-qr" className="btn">
                Generate QR Code
              </Link>
              <Link to="/transfer-batch" className="btn">
                Transfer Batch
              </Link>
            </>
          )}
          {(userRole === 2 || userRole === 3 || userRole === 4) && (
            <Link to="/transfer-batch" className="btn">
              Transfer Batch
            </Link>
          )}
          <Link to="/verify-batch" className="btn">
            Verify Batch
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
