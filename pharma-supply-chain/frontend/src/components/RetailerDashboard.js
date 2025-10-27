import React from 'react';
import { Link } from 'react-router-dom';

const RetailerDashboard = ({ account, userRole }) => {
  return (
    <div className="container">
      <h1>Retailer Dashboard</h1>
      <div className="card">
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <Link to="/transfer-batch" className="btn">Transfer Batch</Link>
          <Link to="/verify-batch" className="btn">Verify Batch</Link>
        </div>
      </div>
      <div className="card">
        <h2>Overview</h2>
        <p>Connected: {account ? `${account.slice(0,6)}...${account.slice(-4)}` : 'Not connected'}</p>
      </div>
    </div>
  );
};

export default RetailerDashboard;
