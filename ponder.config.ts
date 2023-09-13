import type { Config, ResolvedConfig } from "@ponder/core";
import { parseAbiItem } from "viem";

export const config: Config = async () => {
  const MemswapNetworks: Record<string, ResolvedConfig["networks"]> = {
    1: [{ name: "mainnet", chainId: 1, rpcUrl: process.env.PONDER_RPC_URL_1 }],
    5: [{ name: "goerli", chainId: 5, rpcUrl: process.env.PONDER_RPC_URL_5 }],
  };

  const ContractDetails: Record<
    string,
    Record<string, { address: `0x${string}`; startBlock: number }>
  > = {
    mainnet: {
      ERC20: {
        address: process.env.MEMSWAP_ERC20_1 as `0x${string}`,
        startBlock: Number(process.env.MEMSWAP_ERC20_1_STARTBLOCK),
      },
      ERC721: {
        address: process.env.MEMSWAP_ERC721_1 as `0x${string}`,
        startBlock: Number(process.env.MEMSWAP_ERC721_1_STARTBLOCK),
      },
    },
    goerli: {
      ERC20: {
        address: process.env.MEMSWAP_ERC20_5 as `0x${string}`,
        startBlock: Number(process.env.MEMSWAP_ERC20_5_STARTBLOCK),
      },
      ERC721: {
        address: process.env.MEMSWAP_ERC721_5 as `0x${string}`,
        startBlock: Number(process.env.MEMSWAP_ERC721_5_STARTBLOCK),
      },
    },
  };

  const MemswapContracts: Record<string, ResolvedConfig["contracts"]> = {
    1: [
      {
        name: "MemswapERC20",
        network: "mainnet",
        abi: "./abis/MemswapERC20.json",
        address: ContractDetails.mainnet.ERC20.address,
        startBlock: ContractDetails.mainnet.ERC20.startBlock,
      },
      {
        name: "MemswapERC721",
        network: "mainnet",
        abi: "./abis/MemswapERC721.json",
        address: ContractDetails.mainnet.ERC721.address,
        startBlock: ContractDetails.mainnet.ERC721.startBlock,
      },
    ],
    5: [
      {
        name: "MemswapERC20",
        network: "goerli",
        abi: "./abis/MemswapERC20.json",
        address: ContractDetails.goerli.ERC20.address,
        startBlock: ContractDetails.goerli.ERC20.startBlock,
      },
      {
        name: "MemswapERC721",
        network: "goerli",
        abi: "./abis/MemswapERC721.json",
        address: ContractDetails.goerli.ERC721.address,
        startBlock: ContractDetails.goerli.ERC721.startBlock,
      },
    ],
  };

  const MemswapFilters: Record<string, ResolvedConfig["filters"]> = {
    1: [
      {
        name: "ApprovalsERC20",
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
        startBlock: ContractDetails.mainnet.ERC20.startBlock,
        filter: {
          event: parseAbiItem(
            "event Approval(address indexed, address indexed, uint256)"
          ),
          args: [undefined, ContractDetails.mainnet.ERC20.address],
        },
      },
      {
        name: "ApprovalsERC721",
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
        startBlock: ContractDetails.mainnet.ERC721.startBlock,
        filter: {
          event: parseAbiItem(
            "event Approval(address indexed, address indexed, uint256)"
          ),
          args: [undefined, ContractDetails.mainnet.ERC721.address],
        },
      },
    ],
    5: [
      {
        name: "ApprovalsERC20",
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
        startBlock: ContractDetails.goerli.ERC20.startBlock,
        filter: {
          event: parseAbiItem(
            "event Approval(address indexed, address indexed, uint256)"
          ),
          args: [undefined, ContractDetails.goerli.ERC20.address],
        },
      },
      {
        name: "ApprovalsERC721",
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
        startBlock: ContractDetails.goerli.ERC721.startBlock,
        filter: {
          event: parseAbiItem(
            "event Approval(address indexed, address indexed, uint256)"
          ),
          args: [undefined, ContractDetails.goerli.ERC721.address],
        },
      },
    ],
  };

  return {
    networks: MemswapNetworks[Number(process.env.ACTIVE_NETWORK)],
    contracts: MemswapContracts[Number(process.env.ACTIVE_NETWORK)],
    filters: MemswapFilters[Number(process.env.ACTIVE_NETWORK)],
  };
};
