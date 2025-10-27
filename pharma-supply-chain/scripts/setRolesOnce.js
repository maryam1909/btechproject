const hre = require("hardhat");

async function main() {
  const target = "0x6c45A0eA03E5719a4A8d5fb2c2A7eD4D59eA2267";
  const { ethers } = hre;
  const [owner] = await ethers.getSigners();
  console.log("Owner signer:", owner.address);
  console.log("Setting Manufacturer:", target);

  const path = require('path');
  const fs = require('fs');
  const addrPath = path.join(__dirname, '..', 'frontend', 'src', 'contracts', 'contract-address.json');
  const addressJson = JSON.parse(fs.readFileSync(addrPath, 'utf8'));
  const contractAddress = addressJson.address;
  console.log('Contract:', contractAddress);

  const factory = await ethers.getContractFactory('PharmaNFT', owner);
  const contract = factory.attach(contractAddress);

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
