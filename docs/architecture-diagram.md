# Blockchain Pharma Supply Chain – Architecture Diagram

```mermaid
flowchart LR
  %% LAYERS
  subgraph UI[Frontend (React + Ethers.js)]
    MFG[Manufacturer Dashboard\n(CreateBatch, GenerateQR, LinkBatch)]
    DIST[Distributor Dashboard\n(View + TransferBatch)]
    RET[Retailer Dashboard\n(View + Transfer to Consumer)]
    CONS[Consumer App\n(Scan & Verify QR)]
  end

  subgraph BC[Blockchain (Polygon Amoy Testnet)\nSmart Contracts (Solidity + Hardhat)]
    subgraph NFT[ERC-721 Batch NFT Contract]
      role[Roles\nowner, manufacturer]
      reg[registerManufacturer(addr)]
      mint[mintBatchNFT(batchId, ipfsHash)]
      xfer[transferBatch(to, tokenId)]
      hist[transferHistory[tokenId]]
      child[linkChildBatch(parent, child)]
      ownerOf[ownerOf(tokenId)]
    end
  end

  subgraph IPFS[IPFS / Pinning (Pinata/Web3.Storage)]
    meta[Metadata JSON\n(batchId, drugName, dates, QA doc link, qr hash)]
    qa[QA Certificate / Docs]
    qrblob[QR payload + signature (optional)]
  end

  subgraph CRYPTO[Cryptography]
    sign[Manufacturer signs QR payload\n(signer.signMessage(hash))]
    verify[Verify signature on scan\n(utils.verifyMessage(...))]
    hash[Hash QR payload\n(utils.id(JSON.stringify(qrData)))]
  end

  %% USER JOURNEYS
  MFG -->|uploads QA + metadata| meta
  MFG -->|uploads| qa
  MFG -->|calls via ethers.Contract| mint
  mint -->|stores ipfsHash| NFT
  NFT -->|tokenId minted| MFG

  %% QR GENERATION & SIGNING
  MFG -->|build qrData: {batchId, tokenId, contract, verifyUrl}| hash
  hash --> sign
  sign -->|signature| MFG
  MFG -->|save {qrData, signature}| qrblob
  MFG -->|render| CONS

  %% TRANSFERS
  MFG -->|transferBatch(recipient, tokenId)| xfer
  xfer --> hist
  DIST -->|transferBatch| xfer
  RET -->|transferBatch or final sale| xfer

  %% CONSUMER VERIFICATION
  CONS -->|scan QR {qrData, signature}| verify
  verify -->|recoverAddr| role
  role -->|isManufacturer[recovered == registered manufacturer?]| verify
  CONS -->|fetch| ownerOf
  CONS -->|fetch| hist
  CONS -->|fetch IPFS| meta
  meta --> qa

  %% DECISIONS & RESULTS
  verify -->|match| AUTH["Authentic ✅"]
  verify -->|mismatch| FAKE["Counterfeit ❌"]
  ownerOf --> TRAIL["Show current owner"]
  hist --> TRAIL

  %% PARENT-CHILD BATCH LINKING
  MFG -->|linkChildBatch(parent, child)| child

  %% NOTES
  classDef layer fill:#0b7285,stroke:#09414b,color:#fff;
  classDef storage fill:#343a40,stroke:#111,color:#fff;
  classDef chain fill:#5c940d,stroke:#2b5d06,color:#fff;
  classDef crypto fill:#7048e8,stroke:#3e2e8a,color:#fff;

  class UI layer
  class IPFS storage
  class BC chain
  class CRYPTO crypto
```

## How to use
- Paste this Markdown into your report or any Mermaid-enabled renderer.
- The diagram shows roles, NFT minting, IPFS storage, QR signing, transfers, and consumer verification end-to-end.
