import React from 'react';
import { Link } from 'react-router-dom';

const ConsumerDashboard = ({ account, userRole }) => {
  return (
    <div className="container">
      <h1>Consumer Dashboard</h1>
      <div className="card">
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <Link to="/verify-batch" className="btn">Scan/Verify Product</Link>
        </div>
      </div>
      <div className="card">
        <h2>Overview</h2>
        <p>Connected: {account ? `${account.slice(0,6)}...${account.slice(-4)}` : 'Not connected'}</p>
      </div>
    </div>
  );
};

export default ConsumerDashboard;
