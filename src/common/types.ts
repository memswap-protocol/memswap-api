export type ChainIdToAddress = { [chainId: number]: `0x${string}` };

export type AddressType = `0x${string}`;

export enum Protocol {
  ERC20,
  ERC721,
}

export type IntentERC20 = {
  isBuy: boolean;
  buyToken: AddressType;
  sellToken: AddressType;
  maker: AddressType;
  matchmaker: AddressType;
  source: AddressType;
  feeBps: number;
  surplusBps: number;
  startTime: number;
  endTime: number;
  nonce: string;
  isPartiallyFillable: boolean;
  amount: bigint;
  endAmount: bigint;
  startAmountBps: number;
  expectedAmountBps: number;
  hasDynamicSignature: boolean;
  signature: AddressType;
};
