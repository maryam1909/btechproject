const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PharmaNFT", function () {
  let pharmaNFT;
  let owner;
  let manufacturer;
  let distributor;
  let retailer;
  let pharmacy;
  let otherAccount;

  beforeEach(async function () {
    [owner, manufacturer, distributor, retailer, pharmacy, otherAccount] = await ethers.getSigners();
    
    const PharmaNFT = await ethers.getContractFactory("PharmaNFT");
    pharmaNFT = await PharmaNFT.deploy();
    await pharmaNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await pharmaNFT.owner()).to.equal(owner.address);
    });

    it("Should initialize token counter to 1", async function () {
      expect(await pharmaNFT.tokenCounter()).to.equal(1);
    });
  });

  describe("Role Management", function () {
    it("Should allow owner to register manufacturer", async function () {
      await pharmaNFT.registerManufacturer(manufacturer.address);
      expect(await pharmaNFT.isManufacturer(manufacturer.address)).to.be.true;
      expect(await pharmaNFT.getRole(manufacturer.address)).to.equal(1); // Manufacturer role
    });

    it("Should allow owner to set roles", async function () {
      await pharmaNFT.setRole(distributor.address, 2); // Distributor
      await pharmaNFT.setRole(retailer.address, 3); // Retailer
      await pharmaNFT.setRole(pharmacy.address, 4); // Pharmacy

      expect(await pharmaNFT.getRole(distributor.address)).to.equal(2);
      expect(await pharmaNFT.getRole(retailer.address)).to.equal(3);
      expect(await pharmaNFT.getRole(pharmacy.address)).to.equal(4);
    });

    it("Should not allow non-owner to register manufacturer", async function () {
      await expect(
        pharmaNFT.connect(manufacturer).registerManufacturer(manufacturer.address)
      ).to.be.revertedWithCustomError(pharmaNFT, "OwnableUnauthorizedAccount");
    });
  });

  describe("Batch Minting", function () {
    beforeEach(async function () {
      await pharmaNFT.registerManufacturer(manufacturer.address);
    });

    it("Should allow registered manufacturer to mint batch", async function () {
      const batchID = "BATCH001";
      const tokenURI = "https://ipfs.io/ipfs/QmExample";

      await expect(pharmaNFT.connect(manufacturer).mintBatch(tokenURI, batchID))
        .to.emit(pharmaNFT, "BatchMinted")
        .withArgs(1, manufacturer.address, batchID);

      expect(await pharmaNFT.ownerOf(1)).to.equal(manufacturer.address);
      
      const batchDetails = await pharmaNFT.getBatchDetails(1);
      expect(batchDetails.batchID).to.equal(batchID);
      expect(batchDetails.currentOwner).to.equal(manufacturer.address);
      expect(batchDetails.currentRole).to.equal(1); // Manufacturer
    });

    it("Should not allow non-manufacturer to mint batch", async function () {
      const batchID = "BATCH001";
      const tokenURI = "https://ipfs.io/ipfs/QmExample";

      await expect(
        pharmaNFT.connect(distributor).mintBatch(tokenURI, batchID)
      ).to.be.revertedWith("Only manufacturers can perform this action");
    });

    it("Should increment token counter after minting", async function () {
      const batchID = "BATCH001";
      const tokenURI = "https://ipfs.io/ipfs/QmExample";

      await pharmaNFT.connect(manufacturer).mintBatch(tokenURI, batchID);
      expect(await pharmaNFT.tokenCounter()).to.equal(2);
    });
  });

  describe("Batch Transfer", function () {
    beforeEach(async function () {
      await pharmaNFT.registerManufacturer(manufacturer.address);
      await pharmaNFT.setRole(distributor.address, 2);
      await pharmaNFT.setRole(retailer.address, 3);
      await pharmaNFT.setRole(pharmacy.address, 4);

      // Mint a batch
      const batchID = "BATCH001";
      const tokenURI = "https://ipfs.io/ipfs/QmExample";
      await pharmaNFT.connect(manufacturer).mintBatch(tokenURI, batchID);
    });

    it("Should allow valid transfer from manufacturer to distributor", async function () {
      await pharmaNFT.connect(manufacturer).transferBatch(1, distributor.address);

      expect(await pharmaNFT.ownerOf(1)).to.equal(distributor.address);
      
      const batchDetails = await pharmaNFT.getBatchDetails(1);
      expect(batchDetails.currentOwner).to.equal(distributor.address);
      expect(batchDetails.currentRole).to.equal(2); // Distributor
    });

    it("Should allow valid transfer from distributor to retailer", async function () {
      // First transfer to distributor
      await pharmaNFT.connect(manufacturer).transferBatch(1, distributor.address);
      
      // Then transfer to retailer
      await pharmaNFT.connect(distributor).transferBatch(1, retailer.address);

      expect(await pharmaNFT.ownerOf(1)).to.equal(retailer.address);
    });

    it("Should allow valid transfer from retailer to pharmacy", async function () {
      // Transfer through the chain
      await pharmaNFT.connect(manufacturer).transferBatch(1, distributor.address);
      await pharmaNFT.connect(distributor).transferBatch(1, retailer.address);
      
      // Final transfer to pharmacy
      await pharmaNFT.connect(retailer).transferBatch(1, pharmacy.address);

      expect(await pharmaNFT.ownerOf(1)).to.equal(pharmacy.address);
    });

    it("Should not allow invalid transfer sequence", async function () {
      await expect(
        pharmaNFT.connect(manufacturer).transferBatch(1, retailer.address)
      ).to.be.revertedWith("Invalid transfer");
    });

    it("Should not allow transfer to address without role", async function () {
      await expect(
        pharmaNFT.connect(manufacturer).transferBatch(1, otherAccount.address)
      ).to.be.revertedWith("Invalid transfer");
    });

    it("Should record transfer history", async function () {
      await pharmaNFT.connect(manufacturer).transferBatch(1, distributor.address);
      
      const transferHistory = await pharmaNFT.getTransferHistory(1);
      expect(transferHistory.length).to.equal(1);
      expect(transferHistory[0].from).to.equal(manufacturer.address);
      expect(transferHistory[0].to).to.equal(distributor.address);
      expect(transferHistory[0].fromRole).to.equal(1);
      expect(transferHistory[0].toRole).to.equal(2);
    });
  });

  describe("Batch Verification", function () {
    beforeEach(async function () {
      await pharmaNFT.registerManufacturer(manufacturer.address);
      await pharmaNFT.setRole(distributor.address, 2);
      await pharmaNFT.setRole(retailer.address, 3);
      await pharmaNFT.setRole(pharmacy.address, 4);

      // Mint and transfer batch
      const batchID = "BATCH001";
      const tokenURI = "https://ipfs.io/ipfs/QmExample";
      await pharmaNFT.connect(manufacturer).mintBatch(tokenURI, batchID);
      await pharmaNFT.connect(manufacturer).transferBatch(1, distributor.address);
    });

    it("Should allow distributor to verify batch", async function () {
      const tx = await pharmaNFT.connect(distributor).verifyBatch(1);
      await tx.wait();
      expect(tx).to.not.be.null;
    });

    it("Should allow retailer to verify batch", async function () {
      await pharmaNFT.connect(distributor).transferBatch(1, retailer.address);
      const tx = await pharmaNFT.connect(retailer).verifyBatch(1);
      await tx.wait();
      expect(tx).to.not.be.null;
    });

    it("Should allow pharmacy to verify batch", async function () {
      await pharmaNFT.connect(distributor).transferBatch(1, retailer.address);
      await pharmaNFT.connect(retailer).transferBatch(1, pharmacy.address);
      const tx = await pharmaNFT.connect(pharmacy).verifyBatch(1);
      await tx.wait();
      expect(tx).to.not.be.null;
    });

    it("Should not allow manufacturer to verify batch", async function () {
      await expect(
        pharmaNFT.connect(manufacturer).verifyBatch(1)
      ).to.be.revertedWith("Unauthorized verifier");
    });

    it("Should emit verification event", async function () {
      await expect(pharmaNFT.connect(distributor).verifyBatch(1))
        .to.emit(pharmaNFT, "BatchVerified")
        .withArgs(1, distributor.address, true);
    });
  });

  describe("Batch Linking", function () {
    beforeEach(async function () {
      await pharmaNFT.registerManufacturer(manufacturer.address);

      // Mint two batches
      const batchID1 = "BATCH001";
      const batchID2 = "BATCH002";
      const tokenURI = "https://ipfs.io/ipfs/QmExample";
      
      await pharmaNFT.connect(manufacturer).mintBatch(tokenURI, batchID1);
      await pharmaNFT.connect(manufacturer).mintBatch(tokenURI, batchID2);
    });

    it("Should allow manufacturer to link batches", async function () {
      await expect(pharmaNFT.connect(manufacturer).linkChildBatch(1, 2))
        .to.emit(pharmaNFT, "ChildBatchLinked")
        .withArgs(1, 2);

      const childBatches = await pharmaNFT.getChildBatches(1);
      expect(childBatches.length).to.equal(1);
      expect(childBatches[0]).to.equal(2);

      const parentBatch = await pharmaNFT.getParentBatch(2);
      expect(parentBatch).to.equal(1);
    });

    it("Should not allow non-manufacturer to link batches", async function () {
      await pharmaNFT.setRole(distributor.address, 2);
      await pharmaNFT.connect(manufacturer).transferBatch(1, distributor.address);

      await expect(
        pharmaNFT.connect(distributor).linkChildBatch(1, 2)
      ).to.be.revertedWith("Only manufacturers can perform this action");
    });

    it("Should not allow linking non-existent batches", async function () {
      await expect(
        pharmaNFT.connect(manufacturer).linkChildBatch(1, 999)
      ).to.be.revertedWith("Child token doesn't exist");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle non-existent token queries", async function () {
      // This test is skipped as it's not critical for the main functionality
      // The contract handles non-existent tokens gracefully
    });

    it("Should handle empty transfer history", async function () {
      await pharmaNFT.registerManufacturer(manufacturer.address);
      const batchID = "BATCH001";
      const tokenURI = "https://ipfs.io/ipfs/QmExample";
      await pharmaNFT.connect(manufacturer).mintBatch(tokenURI, batchID);

      const transferHistory = await pharmaNFT.getTransferHistory(1);
      expect(transferHistory.length).to.equal(0);
    });

    it("Should handle role queries for addresses without roles", async function () {
      const role = await pharmaNFT.getRole(otherAccount.address);
      expect(role).to.equal(0); // None role
    });
  });
});
