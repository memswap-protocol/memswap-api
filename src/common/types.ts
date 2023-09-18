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
  solver: AddressType;
  source: AddressType;
  feeBps: number;
  surplusBps: number;
  startTime: number;
  endTime: number;
  isPartiallyFillable: boolean;
  isIncentivized: boolean;
  isSmartOrder: boolean;
  amount: bigint;
  endAmount: bigint;
  startAmountBps: number;
  expectedAmountBps: number;
  signature: AddressType;
};

export type IntentERC721 = IntentERC20 & {
  isCriteriaOrder: boolean;
  tokenIdOrCriteria: bigint;
};

export type IntentERC20Approval = {
  isBuy: boolean;
  buyToken: AddressType;
  sellToken: AddressType;
  maker: AddressType;
  solver: AddressType;
  source: AddressType;
  feeBps: number;
  surplusBps: number;
  startTime: number;
  endTime: number;
  nonce: bigint;
  isPartiallyFillable: boolean;
  isSmartOrder: boolean;
  isIncentivized: boolean;
  amount: bigint;
  endAmount: bigint;
  startAmountBps: number;
  expectedAmountBps: number;
  signature: AddressType;
};

export type IntentERC721Approval = IntentERC20Approval & {
  isCriteriaOrder: boolean;
  tokenIdOrCriteria: bigint;
};
