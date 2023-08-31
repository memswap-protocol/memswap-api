import { MEMSWAP } from "./constants";

export const getEIP712Domain = (chainId: number) => ({
  name: "Memswap",
  version: "1.0",
  chainId,
  verifyingContract: MEMSWAP[chainId],
});

export const getEIP712TypesForIntent = () => ({
  Intent: [
    {
      name: "tokenIn",
      type: "address",
    },
    {
      name: "tokenOut",
      type: "address",
    },
    {
      name: "maker",
      type: "address",
    },
    {
      name: "matchmaker",
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
      name: "deadline",
      type: "uint32",
    },
    {
      name: "isPartiallyFillable",
      type: "bool",
    },
    {
      name: "amountIn",
      type: "uint128",
    },
    {
      name: "endAmountOut",
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
