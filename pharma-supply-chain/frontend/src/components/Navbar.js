import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = ({ account, userRole, onDisconnect, networkLabel, balanceLabel }) => {
  const getRoleName = (role) => {
    switch (role) {
      case 1: return 'Manufacturer';
      case 2: return 'Distributor';
      case 3: return 'Retailer';
      case 4: return 'Pharmacy';
      default: return 'None';
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

  return (
    <nav className="navbar">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Pharma Supply Chain Tracker</h1>
            <Link to="/" style={{ color: 'white', textDecoration: 'none', marginRight: '20px' }}>
              Dashboard
            </Link>
            {userRole === 1 && (
              <>
                <Link to="/create-batch" style={{ color: 'white', textDecoration: 'none', marginRight: '20px' }}>
                  Create Batch
                </Link>
                <Link to="/generate-qr" style={{ color: 'white', textDecoration: 'none', marginRight: '20px' }}>
                  Generate QR
                </Link>
                <Link to="/link-batch" style={{ color: 'white', textDecoration: 'none', marginRight: '20px' }}>
                  Link Batches
                </Link>
              </>
            )}
            {(userRole === 2 || userRole === 3 || userRole === 4) && (
              <Link to="/transfer-batch" style={{ color: 'white', textDecoration: 'none', marginRight: '20px' }}>
                Transfer Batch
              </Link>
            )}
            <Link to="/verify-batch" style={{ color: 'white', textDecoration: 'none', marginRight: '20px' }}>
              Verify Batch
            </Link>
          </div>
          
          <div className="user-info">
            {networkLabel && (
              <div style={{ fontSize: '12px', marginBottom: '6px', color: '#cce' }}>
                {networkLabel} {balanceLabel ? `• ${balanceLabel}` : ''}
              </div>
            )}
            <div style={{ marginBottom: '5px' }}>
              <span className={`role-badge ${getRoleClass(userRole)}`}>
                {getRoleName(userRole)}
              </span>
            </div>
            <div style={{ fontSize: '14px', marginBottom: '10px' }}>
              {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}
            </div>
            <button 
              className="btn btn-danger" 
              onClick={onDisconnect}
              style={{ fontSize: '12px', padding: '5px 10px' }}
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
