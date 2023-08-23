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
      address: "0x749f8feaec5eb53f9ce677a252467fa289272591",
      startBlock: 9567324,
    },
  ],
};
