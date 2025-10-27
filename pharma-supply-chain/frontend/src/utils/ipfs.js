// IPFS utility functions for metadata and document storage
// This is a simplified implementation - in production, use a proper IPFS service

class IPFSUtils {
  constructor() {
    this.gateway = process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
  }

  // Simulate uploading to IPFS (replace with actual IPFS client)
  async uploadToIPFS(data) {
    try {
      // In a real implementation, you would:
      // 1. Connect to IPFS node
      // 2. Add data to IPFS
      // 3. Pin the content
      // 4. Return the IPFS hash
      
      // For now, simulate with a mock hash
      const mockHash = `QmMockHash${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Simulated IPFS upload:', mockHash);
      return mockHash;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    }
  }

  // Get IPFS content URL
  getIPFSUrl(hash) {
    return `${this.gateway}${hash}`;
  }

  // Upload JSON metadata
  async uploadMetadata(metadata) {
    const jsonString = JSON.stringify(metadata, null, 2);
    const hash = await this.uploadToIPFS(jsonString);
    return {
      hash,
      url: this.getIPFSUrl(hash)
    };
  }

  // Upload file (QA certificate, documents)
  async uploadFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hash = await this.uploadToIPFS(arrayBuffer);
    return {
      hash,
      url: this.getIPFSUrl(hash)
    };
  }

  // Create batch metadata structure
  createBatchMetadata(batchData) {
    return {
      name: `Pharma Batch: ${batchData.batchID}`,
      description: `Pharmaceutical batch ${batchData.batchID}`,
      image: "https://via.placeholder.com/300x300?text=Pharma+Batch",
      external_url: `https://pharma-tracker.com/batch/${batchData.batchID}`,
      attributes: [
        {
          trait_type: "Drug Name",
          value: batchData.drugName
        },
        {
          trait_type: "Manufacturing Date",
          value: batchData.mfgDate
        },
        {
          trait_type: "Expiry Date",
          value: batchData.expiryDate
        },
        {
          trait_type: "Quantity",
          value: batchData.quantity
        },
        {
          trait_type: "Batch ID",
          value: batchData.batchID
        },
        {
          trait_type: "Manufacturer",
          value: batchData.manufacturer
        }
      ]
    };
  }

  // Validate IPFS hash format
  isValidIPFSHash(hash) {
    // Basic validation for IPFS hash format
    return hash && hash.startsWith('Qm') && hash.length === 46;
  }
}

const ipfsInstance = new IPFSUtils();
export default ipfsInstance;
