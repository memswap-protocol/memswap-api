import type { Config } from "@ponder/core";
import { parseAbiItem } from "viem";

export const config: Config = {
  networks: [
    { name: "mainnet", chainId: 1, rpcUrl: process.env.PONDER_RPC_URL_1 },
  ],
  contracts: [
    {
      name: "Memswap",
      network: "mainnet",
      abi: "./abis/Memswap.json",
      address: "0x63c9362a7bedc92dec83433c15d623fbd3e1e5a9",
      startBlock: 18025406,
    },
  ],
  filters: [
    {
      name: "Approvals",
      network: "mainnet",
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
      startBlock: 18025406,
      filter: {
        event: parseAbiItem(
          "event Approval(address indexed, address indexed, uint256)"
        ),
        args: [undefined, "0x63c9362a7bedc92dec83433c15d623fbd3e1e5a9"],
      },
    },
  ],
};
