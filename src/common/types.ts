export type MatchmakerIntent = {
  tokenIn: string;
  tokenOut: string;
  maker: `0x${string}`;
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
  signature: `0x${string}`;
};
