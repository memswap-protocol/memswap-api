import type { Config } from "@ponder/core";

export const config: Config = {
  networks: [
    { name: "goerli", chainId: 5, rpcUrl: process.env.PONDER_RPC_URL_5 },
  ],
  contracts: [
    {
      name: "Memswap",
      network: "goerli",
      abi: "./abis/Memswap.json",
      address: "0x62E309AdCF935D62f824081148798eF8A7466b66",
      startBlock: 9595589,
    },
  ],
};
