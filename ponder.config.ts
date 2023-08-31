import type { Config } from "@ponder/core";
import { parseAbiItem } from "viem";

export const config: Config = {
  networks: [
    { name: "goerli", chainId: 5, rpcUrl: process.env.PONDER_RPC_URL_5 },
    { name: "mainnet", chainId: 1, rpcUrl: process.env.PONDER_RPC_URL_1 },
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
  filters: [
    {
      name: "Approvals",
      network: "goerli",
      abi: [
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              type: "address",
            },
            {
              indexed: true,
              internalType: "address",
              type: "address",
            },
            {
              indexed: false,
              internalType: "uint256",
              type: "uint256",
            },
          ],
          name: "Approval",
          type: "event",
        },
      ],
      startBlock: 9595589,
      filter: {
        event: parseAbiItem(
          "event Approval(address indexed, address indexed, uint256)"
        ),
        args: [undefined, "0x62E309AdCF935D62f824081148798eF8A7466b66"],
      },
    },
  ],
};
