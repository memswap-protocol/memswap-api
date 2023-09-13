import { ChainIdToAddress } from "./types";
import { Chain, goerli, mainnet } from "viem/chains";
import { Assign } from "viem/dist/types/types/utils";
import { ChainConfig, ChainFormatters } from "viem/dist/types/types/chain";

export const MEMSWAP_ERC20: ChainIdToAddress = {
  1: process.env.MEMSWAP_ERC20_1 as `0x${string}`,
  5: process.env.MEMSWAP_ERC20_5 as `0x${string}`,
};

export const MEMSWAP_ERC721: ChainIdToAddress = {
  1: process.env.MEMSWAP_ERC721_1 as `0x${string}`,
  5: process.env.MEMSWAP_ERC721_5 as `0x${string}`,
};

export const MEMSWAP_WETH: ChainIdToAddress = {
  1: "0x2712515766af2e2680f20e8372c7ea6010eaca66",
  5: "0x5088a0a51e45b5a00c049676dc11f12bb8b4ec29",
};

export const REGULAR_WETH: ChainIdToAddress = {
  1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  5: "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6",
};

export const MemswapChains: Record<
  string,
  Assign<Chain, ChainConfig<ChainFormatters>>
> = {
  "1": mainnet,
  "5": goerli,
};

export const RESERVOIR_API_URL: Record<number, string> = {
  1: "https://api.reservoir.tools",
  5: "https://api-goerli.reservoir.tools",
};
