import type { Config, ResolvedConfig } from "@ponder/core";
import { parseAbiItem } from "viem";

const ContractDetails: Record<
  string,
  { address: `0x${string}`; startBlock: number }
> = {
  mainnet: { address: "0x", startBlock: 9657704 },
  goerli: {
    address: "0xd8c0e3287ba121925987baa85338b8a87574789e",
    startBlock: 9657704,
  },
};

const MemswapNetworks: Record<string, ResolvedConfig["networks"]> = {
  1: [{ name: "mainnet", chainId: 1, rpcUrl: process.env.PONDER_RPC_URL_1 }],
  5: [{ name: "goerli", chainId: 5, rpcUrl: process.env.PONDER_RPC_URL_5 }],
};

const MemswapContracts: Record<string, ResolvedConfig["contracts"]> = {
  1: [
    {
      name: "Memswap",
      network: "mainnet",
      abi: "./abis/MemswapERC20.json",
      address: ContractDetails.mainnet.address,
      startBlock: ContractDetails.mainnet.startBlock,
    },
  ],
  5: [
    {
      name: "Memswap",
      network: "goerli",
      abi: "./abis/MemswapERC20.json",
      address: ContractDetails.goerli.address,
      startBlock: ContractDetails.goerli.startBlock,
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
      startBlock: ContractDetails.mainnet.startBlock,
      filter: {
        event: parseAbiItem(
          "event Approval(address indexed, address indexed, uint256)"
        ),
        args: [undefined, ContractDetails.mainnet.address],
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
      startBlock: 9455106,
      filter: {
        event: parseAbiItem(
          "event Approval(address indexed, address indexed, uint256)"
        ),
        args: [undefined, ContractDetails.goerli.address],
      },
    },
  ],
};

export const config: Config = {
  networks: MemswapNetworks[Number(process.env.ACTIVE_NETWORK)],
  contracts: MemswapContracts[Number(process.env.ACTIVE_NETWORK)],
  filters: MemswapFilters[Number(process.env.ACTIVE_NETWORK)],
};
