import React, { useState } from 'react';
import { ethers } from 'ethers';

const RegisterManufacturer = ({ contract, account }) => {
  const [manufacturerAddress, setManufacturerAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRegister = async () => {
    if (!manufacturerAddress.trim()) {
      setMessage('Please enter manufacturer address');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      // Validate address format
      if (!ethers.isAddress(manufacturerAddress)) {
        throw new Error('Invalid address format');
      }

      // Check if already registered
      const isAlreadyManufacturer = await contract.isManufacturer(manufacturerAddress);
      if (isAlreadyManufacturer) {
        throw new Error('Address is already registered as a manufacturer');
      }

      // Register manufacturer
      const tx = await contract.registerManufacturer(manufacturerAddress);
      await tx.wait();

      setMessage('Manufacturer registered successfully!');
      setManufacturerAddress('');

    } catch (error) {
      console.error('Error registering manufacturer:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Register Manufacturer</h1>
        
        <div className="info">
          <strong>Note:</strong> Only the contract owner can register new manufacturers. 
          This ensures that only verified pharmaceutical companies can mint batches.
        </div>
        
        {message && (
          <div className={message.includes('Error') ? 'error' : 'success'}>
            {message}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="manufacturerAddress">Manufacturer Address</label>
          <input
            type="text"
            id="manufacturerAddress"
            value={manufacturerAddress}
            onChange={(e) => setManufacturerAddress(e.target.value)}
            placeholder="0x..."
            disabled={loading}
          />
          <small>Enter the wallet address of the manufacturer to register</small>
        </div>

        <button 
          className="btn"
          onClick={handleRegister}
          disabled={!manufacturerAddress.trim() || loading}
        >
          {loading ? 'Registering...' : 'Register Manufacturer'}
        </button>

        <div style={{ marginTop: '30px', padding: '15px', background: '#e9ecef', borderRadius: '4px' }}>
          <h3>Manufacturer Registration:</h3>
          <ul>
            <li>Only contract owners can register manufacturers</li>
            <li>Registered manufacturers can mint new batches</li>
            <li>Manufacturers can create QR codes and link batches</li>
            <li>This ensures supply chain integrity and authenticity</li>
            <li>All manufacturer actions are recorded on the blockchain</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RegisterManufacturer;
