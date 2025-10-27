require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config({ path: './env' });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      chainId: 1337
    },
    amoy: {
      url: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts: [
        process.env.PRIVATE_KEY_OWNER,
        process.env.PRIVATE_KEY_MANUFACTURER,
        process.env.PRIVATE_KEY_DISTRIBUTOR,
        process.env.PRIVATE_KEY_RETAILER,
        process.env.PRIVATE_KEY_PHARMACY
      ]
        .filter((key) => typeof key === 'string' && key.trim().length > 0)
        .map((key) => (key.startsWith('0x') ? key : `0x${key}`)),
      chainId: 80002
    }
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || ""
    }
  }
};
