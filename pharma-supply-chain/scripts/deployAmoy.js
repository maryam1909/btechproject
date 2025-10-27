const hre = require("hardhat");

async function main() {
  console.log("Deploying PharmaNFT to Polygon Amoy testnet...");

  // Build signers explicitly from env to avoid provider limitations
  const { ethers } = hre;
  const provider = ethers.provider;

  const makeWallet = (key) => (key ? new ethers.Wallet(key.startsWith('0x') ? key : `0x${key}`, provider) : null);

  const owner = makeWallet(process.env.PRIVATE_KEY_OWNER);
  const manufacturer = makeWallet(process.env.PRIVATE_KEY_MANUFACTURER);
  const distributor = makeWallet(process.env.PRIVATE_KEY_DISTRIBUTOR);
  const retailer = makeWallet(process.env.PRIVATE_KEY_RETAILER);
  const pharmacy = makeWallet(process.env.PRIVATE_KEY_PHARMACY);

  if (!owner) throw new Error('Missing PRIVATE_KEY_OWNER');

  console.log("Deployer (Owner):", owner.address);
  if (manufacturer) console.log("Manufacturer:", manufacturer.address);
  if (distributor) console.log("Distributor:", distributor.address);
  if (retailer) console.log("Retailer:", retailer.address);
  if (pharmacy) console.log("Pharmacy:", pharmacy.address);

  // Get the contract factory with owner signer
  const PharmaNFT = await hre.ethers.getContractFactory("PharmaNFT", owner);
  
  // Deploy the contract
  const pharma = await PharmaNFT.deploy();
  await pharma.waitForDeployment();

  const contractAddress = await pharma.getAddress();
  console.log("PharmaNFT deployed to:", contractAddress);

  // Verify deployment
  console.log("Verifying deployment...");
  const tokenCounter = await pharma.tokenCounter();
  console.log("Initial token counter:", tokenCounter.toString());

  console.log("\nSetting up roles...");
  
  // Register manufacturer
  if (manufacturer) {
    try {
      const tx1 = await pharma.registerManufacturer(manufacturer.address);
      await tx1.wait();
      console.log("✓ Manufacturer registered:", manufacturer.address);
    } catch (error) {
      console.log("Error registering manufacturer:", error.message);
    }
  }

  // Set roles for other stakeholders
  try {
    if (distributor) {
      const tx2 = await pharma.setRole(distributor.address, 2); // Distributor
      await tx2.wait();
      console.log("✓ Distributor role set:", distributor.address);
    }
    if (retailer) {
      const tx3 = await pharma.setRole(retailer.address, 3); // Retailer
      await tx3.wait();
      console.log("✓ Retailer role set:", retailer.address);
    }
    if (pharmacy) {
      const tx4 = await pharma.setRole(pharmacy.address, 4); // Pharmacy
      await tx4.wait();
      console.log("✓ Pharmacy role set:", pharmacy.address);
    }
  } catch (error) {
    console.log("Error setting roles:", error.message);
  }

  console.log("\n=== Deployment Summary ===");
  console.log("Contract Address:", contractAddress);
  console.log("Network: Polygon Amoy Testnet");
  console.log("Deployer (Owner):", owner.address);
  if (manufacturer) console.log("Manufacturer:", manufacturer.address);
  if (distributor) console.log("Distributor:", distributor.address);
  if (retailer) console.log("Retailer:", retailer.address);
  if (pharmacy) console.log("Pharmacy:", pharmacy.address);
  console.log("\nNext steps:");
  console.log("1. Update CONTRACT_ADDRESS in frontend/src/App.js");
  console.log("2. Get contract ABI from artifacts/contracts/PharmaNFT.sol/PharmaNFT.json");
  console.log("3. Update CONTRACT_ABI in frontend/src/App.js");
  console.log("4. Test the application with the deployed contract");

  // Save deployment info to a file
  const deploymentInfo = {
    contractAddress,
    deployer: owner.address,
    network: "Polygon Amoy Testnet",
    timestamp: new Date().toISOString(),
    stakeholders: {
      owner: owner.address,
      manufacturer: manufacturer.address,
      distributor: distributor.address,
      retailer: retailer.address,
      pharmacy: pharmacy.address
    }
  };

  const fs = require('fs');
  const path = require('path');
  fs.writeFileSync(
    'deployment-info.json', 
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\nDeployment info saved to deployment-info.json");

  // Write frontend contract files
  try {
    const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'PharmaNFT.sol', 'PharmaNFT.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const frontendDir = path.join(__dirname, '..', 'frontend', 'src', 'contracts');
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }
    fs.writeFileSync(path.join(frontendDir, 'PharmaNFT.json'), JSON.stringify(artifact, null, 2));
    fs.writeFileSync(path.join(frontendDir, 'contract-address.json'), JSON.stringify({ address: contractAddress }, null, 2));
    console.log('Frontend contract files written to frontend/src/contracts');
  } catch (err) {
    console.log('Warning: could not write frontend contract files:', err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
