import type { Config, ResolvedConfig } from "@ponder/core";
import { parseAbiItem } from "viem";

const MemswapNetworks: Record<string, ResolvedConfig["networks"]> = {
  1: [{ name: "mainnet", chainId: 1, rpcUrl: process.env.PONDER_RPC_URL_1 }],
  5: [{ name: "goerli", chainId: 5, rpcUrl: process.env.PONDER_RPC_URL_5 }],
};

const MemswapContracts: Record<string, ResolvedConfig["contracts"]> = {
  1: [
    {
      name: "Memswap" as string,
      network: "mainnet",
      abi: "./abis/Memswap.json",
      address: "0x63c9362a7bedc92dec83433c15d623fbd3e1e5a9",
      startBlock: 18025406,
    },
  ],
  5: [
    {
      name: "Memswap",
      network: "goerli",
      abi: "./abis/Memswap.json",
      address: "0x62E309AdCF935D62f824081148798eF8A7466b66",
      startBlock: 9595589,
    },
  ],
};

const MemswapFilters: Record<string, ResolvedConfig["filters"]> = {
  1: [
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
  5: [
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

export const config: Config = {
  networks: MemswapNetworks[Number(process.env.ACTIVE_NETWORK)],
  contracts: MemswapContracts[Number(process.env.ACTIVE_NETWORK)],
  filters: MemswapFilters[Number(process.env.ACTIVE_NETWORK)],
};
