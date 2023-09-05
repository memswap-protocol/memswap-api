export type ChainIdToAddress = { [chainId: number]: `0x${string}` };

export type MatchmakerIntent = {
  tokenIn: string;
  tokenOut: string;
  maker: string;
  matchmaker: string;
  source: string;
  feeBps: number;
  surplusBps: number;
  deadline: number;
  isPartiallyFillable: boolean;
  amountIn: string;
  endAmountOut: string;
  startAmountBps: number;
  expectedAmountBps: number;
  signature: string;
};

export type AddressType = `0x${string}`;
