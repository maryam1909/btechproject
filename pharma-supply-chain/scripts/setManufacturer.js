const hre = require("hardhat");

async function main() {
  const target = process.argv[2] || process.env.MANUFACTURER_ADDRESS;
  if (!target) throw new Error("Usage: set MANUFACTURER_ADDRESS env or pass positional arg: npx hardhat run scripts/setManufacturer.js --network amoy <ADDRESS>");

  const { ethers } = hre;
  const [owner] = await ethers.getSigners();
  console.log("Owner signer:", owner.address);
  console.log("Setting Manufacturer:", target);

  const PharmaNFT = await ethers.getContractFactory("PharmaNFT", owner);
  // Read address from frontend artifact written by deploy script
  const path = require('path');
  const fs = require('fs');
  const addrPath = path.join(__dirname, '..', 'frontend', 'src', 'contracts', 'contract-address.json');
  const addressJson = JSON.parse(fs.readFileSync(addrPath, 'utf8'));
  const contractAddress = addressJson.address;
  if (!contractAddress) throw new Error('Missing frontend/src/contracts/contract-address.json');

  const contract = PharmaNFT.attach(contractAddress);
  console.log('Contract:', contractAddress);

  // Register manufacturer role and mapping
  const tx = await contract.registerManufacturer(target);
  console.log('registerManufacturer tx:', tx.hash);
  await tx.wait();
  console.log('✓ Manufacturer registered:', target);

  const role = await contract.getRole(target);
  console.log('Role now:', Number(role));
  const isMfg = await contract.isManufacturer(target);
  console.log('isManufacturer:', isMfg);
}

main().catch((e) => { console.error(e); process.exit(1); });
