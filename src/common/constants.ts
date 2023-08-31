import { goerli } from "viem/chains";

type ChainIdToAddress = { [chainId: number]: `0x${string}` };

// Protocol
export const MEMSWAP: ChainIdToAddress = {
  5: "0x62e309adcf935d62f824081148798ef8a7466b66",
};

export const MEMSWAP_WETH: ChainIdToAddress = {
  5: "0x5088a0a51e45b5a00c049676dc11f12bb8b4ec29",
};

export const CHAINS = {
  5: {
    chain: goerli,
    rpcUrl: process.env.PONDER_RPC_URL_5,
    wsUrl: process.env.WEBSOCKET_RPC_URL_5,
  },
};
