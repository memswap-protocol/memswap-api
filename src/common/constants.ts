import { ChainIdToAddress } from "./types";
import { Chain, goerli, mainnet } from "viem/chains";
import { Assign } from "viem/dist/types/types/utils";
import { ChainConfig, ChainFormatters } from "viem/dist/types/types/chain";

export const MEMSWAP_ERC20: ChainIdToAddress = {
  1: "0x63c9362a7bedc92dec83433c15d623fbd3e1e5a9",
  5: "0xd8c0e3287ba121925987baa85338b8a87574789e",
};

export const MEMSWAP_ERC721: ChainIdToAddress = {
  1: "0x",
  5: "0xcc22e868f4e7fb16cdcbfc70dbdd2716c92f8862",
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
