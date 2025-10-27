# 🚀 Complete Setup Guide

## Prerequisites

1. **Node.js** (v16 or higher)
2. **MetaMask** wallet
3. **Testnet MATIC** for gas fees
4. **Environment variables** (provided below)

## Step 1: Environment Setup

Create a `.env` file in the root directory with your credentials:

```bash
# RPC URL for Polygon Amoy Testnet
AMOY_RPC_URL="https://polygon-amoy.infura.io/v3/60799c082f5843e29090ff4ea135bc5d"

# Private keys for different stakeholders (without 0x prefix)
PRIVATE_KEY_OWNER="8d0a368d9c597f94827e88cbfbcf79e044e31bfe6c8cc0edb655c3f22208fa8e"
PRIVATE_KEY_MANUFACTURER="8d0a368d9c597f94827e88cbfbcf79e044e31bfe6c8cc0edb655c3f22208fa8e"
PRIVATE_KEY_DISTRIBUTOR="c803a2a3089ece22f5929294e0ae453239bfeb691da5b0bece7480832c4a0c50"
PRIVATE_KEY_RETAILER="c62d255dec514ebd31310f51968aee4a9751733fb2e2e9da8efc07642cb91727"
PRIVATE_KEY_PHARMACY="466896fe5d170e063b06323faa06c8390ae0a18074956ee1ec7ff5d2e900e5ee"

# PolygonScan API key for contract verification
POLYGONSCAN_API_KEY="GTB1Q1SZT4UW27T2C7BI7IC9NXHVYF65NQ"
```

## Step 2: Deploy Smart Contract

### Option A: Using the deployment script (Recommended)
```bash
# Windows
deploy.bat

# Linux/Mac
./deploy.sh
```

### Option B: Manual deployment
```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Polygon Amoy testnet
npx hardhat run scripts/deployAmoy.js --network amoy
```

## Step 3: Test Deployment

```bash
# Test the deployed contract
npx hardhat run scripts/testDeployment.js --network amoy
```

## Step 4: Update Frontend Configuration

After deployment, you'll get a contract address. Update the frontend:

1. **Update Contract Address** in `frontend/src/App.js`:
```javascript
const CONTRACT_ADDRESS = "0x..."; // Your deployed contract address
```

2. **Update Contract ABI** in `frontend/src/App.js`:
```javascript
const CONTRACT_ABI = [...]; // Get from artifacts/contracts/PharmaNFT.sol/PharmaNFT.json
```

## Step 5: Start Frontend

```bash
cd frontend
npm install
npm start
```

## Step 6: Test the System

### 1. Connect MetaMask
- Add Polygon Amoy Testnet to MetaMask
- Import the stakeholder accounts using their private keys
- Ensure accounts have testnet MATIC for gas fees

### 2. Test as Manufacturer
- Connect with manufacturer account
- Create a new batch
- Generate QR code
- Link child batches (if needed)

### 3. Test Supply Chain Flow
- Transfer batch from Manufacturer → Distributor
- Transfer batch from Distributor → Retailer  
- Transfer batch from Retailer → Pharmacy

### 4. Test Consumer Verification
- Scan QR code
- Verify authenticity
- View supply chain history

## Network Configuration for MetaMask

**Polygon Amoy Testnet:**
- Network Name: Polygon Amoy Testnet
- RPC URL: https://polygon-amoy.infura.io/v3/60799c082f5843e29090ff4ea135bc5d
- Chain ID: 80002
- Currency Symbol: MATIC
- Block Explorer: https://amoy.polygonscan.com

## Stakeholder Accounts

Based on your private keys, here are the stakeholder accounts:

- **Owner**: `0x...` (Contract deployer and administrator)
- **Manufacturer**: `0x...` (Can mint batches and generate QR codes)
- **Distributor**: `0x...` (Receives batches from manufacturers)
- **Retailer**: `0x...` (Receives batches from distributors)
- **Pharmacy**: `0x...` (Final destination, can verify batches)

## Testing Checklist

- [ ] Contract deployed successfully
- [ ] All roles assigned correctly
- [ ] Batch creation working
- [ ] QR code generation working
- [ ] Supply chain transfers working
- [ ] Batch verification working
- [ ] Transfer history tracking working
- [ ] Frontend connecting to contract
- [ ] MetaMask integration working

## Troubleshooting

### Common Issues

1. **"Insufficient funds" error:**
   - Get testnet MATIC from [Polygon Faucet](https://faucet.polygon.technology/)
   - Ensure accounts have enough balance for gas

2. **"Contract not deployed" error:**
   - Check contract address in frontend configuration
   - Ensure contract is deployed on correct network

3. **"MetaMask not connected" error:**
   - Connect MetaMask to Polygon Amoy testnet
   - Refresh the page after connecting

4. **"Invalid role" error:**
   - Ensure user has proper role assigned
   - Check role assignment in contract

### Getting Testnet MATIC

1. Visit [Polygon Faucet](https://faucet.polygon.technology/)
2. Enter your wallet address
3. Select "Amoy Testnet"
4. Request testnet MATIC

## Production Deployment

For production deployment:

1. **Deploy to Polygon Mainnet:**
```bash
npx hardhat run scripts/deployAmoy.js --network polygon
```

2. **Update Frontend:**
   - Update contract address and ABI
   - Configure production IPFS gateway
   - Set up domain and SSL

3. **Set up IPFS Pinning:**
   - Use services like Pinata or Web3.Storage
   - Configure automatic pinning for metadata

## Support

If you encounter any issues:

1. Check the troubleshooting section
2. Review contract and frontend logs
3. Verify network configuration
4. Ensure all environment variables are set correctly

## Next Steps

After successful deployment:

1. Test all functionality thoroughly
2. Document any custom configurations
3. Set up monitoring and alerts
4. Plan for production scaling
5. Consider additional features and integrations

---

**🎉 Congratulations!** You now have a fully functional blockchain-based pharmaceutical supply chain tracker system!
