const hre = require("hardhat");
require('dotenv').config({ path: './env' });

async function main() {
  const contractAddress = "0xC37774726D510bEd50bA7a1e626AE10cfC6C0220"; // current Amoy deployment

  const manufacturer = "0x6c45A0eA03E5719a4A8d5fb2c2A7eD4D59eA2267";
  const distributor = "0x9236b51387c167a3D2fE14BdA6bc7517FD0C74C5";
  const retailer    = "0x1d22d371e231E6ccA714CF3a4163a655D5914C02";

  console.log("Configuring roles on:", contractAddress);

  const { ethers } = hre;
  const provider = ethers.provider;
  const owner = new ethers.Wallet(
    (process.env.PRIVATE_KEY_OWNER.startsWith('0x') ? process.env.PRIVATE_KEY_OWNER : `0x${process.env.PRIVATE_KEY_OWNER}`),
    provider
  );

  const contract = await ethers.getContractAt("PharmaNFT", contractAddress, owner);

  // Register manufacturer
  try {
    const isMfg = await contract.isManufacturer(manufacturer);
    if (!isMfg) {
      const tx = await contract.registerManufacturer(manufacturer);
      console.log("registerManufacturer tx:", tx.hash);
      await tx.wait();
      console.log("✓ Manufacturer registered:", manufacturer);
    } else {
      console.log("Manufacturer already registered:", manufacturer);
    }
  } catch (e) {
    console.log("registerManufacturer error:", e.message);
  }

  // Set roles
  const setRole = async (addr, roleNum, label) => {
    try {
      const tx = await contract.setRole(addr, roleNum);
      console.log(`setRole(${label}) tx:`, tx.hash);
      await tx.wait();
      console.log(`✓ ${label} role set:`, addr);
    } catch (e) {
      console.log(`setRole ${label} error:`, e.message);
    }
  };

  await setRole(manufacturer, 1, 'Manufacturer');
  await setRole(distributor, 2, 'Distributor');
  await setRole(retailer, 3, 'Retailer');

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
