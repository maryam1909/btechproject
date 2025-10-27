const hre = require("hardhat");

async function main() {
  const [owner, manufacturer, distributor, retailer, pharmacy] = await hre.ethers.getSigners();
  const PharmaNFT = await hre.ethers.getContractFactory("PharmaNFT");
  const pharma = await PharmaNFT.deploy();
  await pharma.waitForDeployment();

  const contractAddress = await pharma.getAddress();
  console.log("PharmaNFT deployed to:", contractAddress);

  // Set roles
  await pharma.connect(owner).setRole(manufacturer.address, 1); // Manufacturer
  await pharma.connect(owner).setRole(distributor.address, 2); // Distributor
  await pharma.connect(owner).setRole(retailer.address, 3); // Retailer
  await pharma.connect(owner).setRole(pharmacy.address, 4); // Pharmacy

  // Mint batch by manufacturer
  const batchID = "BATCH123";
  const tokenURI = "https://ipfs.io/ipfs/QmExampleMetadata";
  await pharma.connect(manufacturer).mintBatch(tokenURI, batchID);
  // tokenCounter is incremented after mint, so tokenId = tokenCounter - 1
  const tokenId = (await pharma.tokenCounter()) - 1n;
  console.log("Batch minted with tokenId:", tokenId.toString());

  // Transfer to distributor
  await pharma.connect(manufacturer).transferBatch(tokenId, distributor.address);
  console.log("Transferred to distributor");

  // Distributor verifies batch
  const validDistributor = await pharma.connect(distributor).verifyBatch(tokenId);
  console.log("Distributor verification:", validDistributor);

  // Transfer to retailer
  await pharma.connect(distributor).transferBatch(tokenId, retailer.address);
  console.log("Transferred to retailer");

  // Retailer verifies batch
  const validRetailer = await pharma.connect(retailer).verifyBatch(tokenId);
  console.log("Retailer verification:", validRetailer);

  // Transfer to pharmacy
  await pharma.connect(retailer).transferBatch(tokenId, pharmacy.address);
  console.log("Transferred to pharmacy");

  // Pharmacy verifies batch
  const validPharmacy = await pharma.connect(pharmacy).verifyBatch(tokenId);
  console.log("Pharmacy verification:", validPharmacy);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
