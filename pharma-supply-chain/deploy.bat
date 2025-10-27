@echo off
echo 🚀 Starting Pharma Supply Chain Deployment to Polygon Amoy Testnet

REM Check if .env file exists
if not exist .env (
    echo ❌ .env file not found. Please create it with your environment variables.
    echo Example:
    echo AMOY_RPC_URL="https://polygon-amoy.infura.io/v3/YOUR_KEY"
    echo PRIVATE_KEY_OWNER="your_owner_private_key"
    echo PRIVATE_KEY_MANUFACTURER="your_manufacturer_private_key"
    echo PRIVATE_KEY_DISTRIBUTOR="your_distributor_private_key"
    echo PRIVATE_KEY_RETAILER="your_retailer_private_key"
    echo PRIVATE_KEY_PHARMACY="your_pharmacy_private_key"
    echo POLYGONSCAN_API_KEY="your_polygonscan_api_key"
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
npm install

echo 🔨 Compiling smart contracts...
npx hardhat compile

echo 🧪 Running tests...
npx hardhat test

echo 🚀 Deploying to Polygon Amoy testnet...
npx hardhat run scripts/deployAmoy.js --network amoy

echo ✅ Deployment completed!
echo.
echo 📋 Next steps:
echo 1. Update frontend/src/App.js with the deployed contract address
echo 2. Update frontend/src/App.js with the contract ABI
echo 3. Start the frontend: cd frontend && npm start
echo 4. Test the system with different stakeholder accounts
echo.
echo 🔗 Contract deployment info saved to deployment-info.json
pause
