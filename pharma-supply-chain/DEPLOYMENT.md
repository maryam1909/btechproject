# Deployment Guide

## Prerequisites

1. **Node.js** (v16 or higher)
2. **MetaMask** wallet with Polygon Amoy testnet configured
3. **Testnet ETH** for gas fees (get from [Polygon Faucet](https://faucet.polygon.technology/))
4. **Private Key** for deployment account
5. **PolygonScan API Key** (optional, for contract verification)

## Step 1: Environment Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd pharma-supply-chain
npm install
```

2. **Create environment file:**
```bash
cp env.example .env
```

3. **Configure environment variables:**
```bash
# .env file
PRIVATE_KEY=your_private_key_without_0x_prefix
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

## Step 2: Smart Contract Deployment

1. **Compile contracts:**
```bash
npx hardhat compile
```

2. **Run tests:**
```bash
npx hardhat test
```

3. **Deploy to Polygon Amoy testnet:**
```bash
npx hardhat run scripts/deployAmoy.js --network amoy
```

4. **Verify contract (optional):**
```bash
npx hardhat verify --network amoy <CONTRACT_ADDRESS>
```

## Step 3: Frontend Configuration

1. **Install frontend dependencies:**
```bash
cd frontend
npm install
```

2. **Update contract configuration:**
   - Open `frontend/src/App.js`
   - Update `CONTRACT_ADDRESS` with deployed contract address
   - Update `CONTRACT_ABI` with contract ABI from `artifacts/contracts/PharmaNFT.sol/PharmaNFT.json`

3. **Start frontend:**
```bash
npm start
```

## Step 4: Testing the System

### 1. Connect MetaMask
- Ensure MetaMask is connected to Polygon Amoy testnet
- Make sure you have testnet ETH for gas fees

### 2. Register as Manufacturer
- Use the contract owner account
- Navigate to "Register Manufacturer" page
- Register your manufacturer address

### 3. Create a Batch
- Switch to manufacturer account
- Navigate to "Create Batch" page
- Fill in batch details and mint NFT

### 4. Generate QR Code
- Navigate to "Generate QR Code" page
- Select the created batch
- Generate and download QR code

### 5. Test Transfer Flow
- Transfer batch from Manufacturer → Distributor
- Transfer batch from Distributor → Retailer
- Transfer batch from Retailer → Pharmacy

### 6. Test Verification
- Navigate to "Verify Batch" page
- Scan the generated QR code
- Verify authenticity and view supply chain history

## Step 5: Production Deployment

### 1. Deploy to Polygon Mainnet
```bash
# Update hardhat.config.js with mainnet configuration
npx hardhat run scripts/deployAmoy.js --network polygon
```

### 2. Update Frontend
- Update contract address and ABI
- Configure production IPFS gateway
- Set up domain and SSL

### 3. Set up IPFS Pinning
- Use services like Pinata or Web3.Storage
- Configure automatic pinning for metadata

## Troubleshooting

### Common Issues

1. **"Insufficient funds" error:**
   - Get testnet ETH from Polygon faucet
   - Ensure account has enough balance for gas

2. **"Contract not deployed" error:**
   - Check contract address in frontend configuration
   - Ensure contract is deployed on correct network

3. **"MetaMask not connected" error:**
   - Connect MetaMask to Polygon Amoy testnet
   - Refresh the page after connecting

4. **"Invalid role" error:**
   - Ensure user has proper role assigned
   - Check role assignment in contract

### Network Configuration

**Polygon Amoy Testnet:**
- Network Name: Polygon Amoy Testnet
- RPC URL: https://rpc-amoy.polygon.technology
- Chain ID: 80002
- Currency Symbol: MATIC
- Block Explorer: https://amoy.polygonscan.com

## Security Considerations

1. **Private Key Security:**
   - Never commit private keys to version control
   - Use environment variables for sensitive data
   - Consider using hardware wallets for production

2. **Contract Security:**
   - Audit smart contracts before mainnet deployment
   - Use multi-signature wallets for contract ownership
   - Implement access controls and role management

3. **Frontend Security:**
   - Validate all user inputs
   - Implement proper error handling
   - Use HTTPS in production

## Monitoring and Maintenance

1. **Contract Monitoring:**
   - Monitor contract events and transactions
   - Set up alerts for critical functions
   - Track gas usage and optimization

2. **Frontend Monitoring:**
   - Monitor user interactions and errors
   - Track performance metrics
   - Implement analytics and logging

3. **IPFS Maintenance:**
   - Monitor IPFS node health
   - Ensure content availability
   - Implement backup strategies

## Support

For deployment issues:
1. Check the troubleshooting section
2. Review contract and frontend logs
3. Verify network configuration
4. Contact the development team

## Next Steps

After successful deployment:
1. Test all functionality thoroughly
2. Document any custom configurations
3. Set up monitoring and alerts
4. Plan for production scaling
5. Consider additional features and integrations
