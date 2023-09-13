import { MEMSWAP_ERC20, MEMSWAP_ERC721 } from "./constants";
import { Protocol } from "./types";

export const getEIP712Domain = (chainId: number, protocol: Protocol) => ({
  name: protocol === Protocol.ERC20 ? "MemswapERC20" : "MemswapERC721",
  version: "1.0",
  chainId,
  verifyingContract:
    protocol === Protocol.ERC20
      ? MEMSWAP_ERC20[chainId]
      : MEMSWAP_ERC721[chainId],
});

export const getEIP712TypesForIntent = (protocol: Protocol) => ({
  Intent: [
    {
      name: "isBuy",
      type: "bool",
    },
    {
      name: "buyToken",
      type: "address",
    },
    {
      name: "sellToken",
      type: "address",
    },
    {
      name: "maker",
      type: "address",
    },
    {
      name: "solver",
      type: "address",
    },
    {
      name: "source",
      type: "address",
    },
    {
      name: "feeBps",
      type: "uint16",
    },
    {
      name: "surplusBps",
      type: "uint16",
    },
    {
      name: "startTime",
      type: "uint32",
    },
    {
      name: "endTime",
      type: "uint32",
    },
    // {
    //   name: "nonce",
    //   type: "uint256",
    // },
    {
      name: "isPartiallyFillable",
      type: "bool",
    },
    {
      name: "isSmartOrder",
      type: "bool",
    },
    ...(protocol === Protocol.ERC721
      ? [
          {
            name: "isCriteriaOrder",
            type: "bool",
          },
          {
            name: "tokenIdOrCriteria",
            type: "uint256",
          },
        ]
      : []),
    {
      name: "amount",
      type: "uint128",
    },
    {
      name: "endAmount",
      type: "uint128",
    },
    {
      name: "startAmountBps",
      type: "uint16",
    },
    {
      name: "expectedAmountBps",
      type: "uint16",
    },
  ],
});
