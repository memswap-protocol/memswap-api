import { Context } from "@/generated";
import {
  createPublicClient,
  decodeAbiParameters,
  decodeFunctionData,
  http,
  parseAbi,
  parseAbiParameters,
  zeroAddress,
} from "viem";
import {
  MEMSWAP_ERC20,
  MEMSWAP_WETH,
  MemswapChains,
  REGULAR_WETH,
} from "./common/constants";
import { AddressType, IntentERC20, Protocol } from "./common/types";
import { getEIP712Domain, getEIP712TypesForIntent } from "./common/utils";
import { Transaction } from "@ponder/core";
import { Currency, WETH9, Token, Ether } from "@uniswap/sdk-core";

export const approvalCheck = async (
  transaction: Transaction,
  context: Context
) => {
  try {
    const chain = MemswapChains[Number(process.env.ACTIVE_NETWORK)];

    const approvalTx = decodeFunctionData({
      abi: [
        {
          inputs: [{ type: "address" }, { type: "uint256" }],
          name: "approve",
          outputs: [{ type: "bool" }],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [{ type: "address" }, { type: "uint256" }],
          name: "depositAndApprove",
          outputs: [],
          stateMutability: "payable",
          type: "function",
        },
      ],
      data: transaction.input,
    });

    let restOfCalldata: `0x${string}` | undefined;
    let approvalTxHash: `0x${string}` | undefined;

    const spender = (
      approvalTx.args?.[0] as `0x${string}`
    ).toLowerCase() as `0x${string}`;

    if (
      approvalTx.args &&
      (spender === MEMSWAP_ERC20[chain.id] ||
        spender === MEMSWAP_WETH[chain.id])
    ) {
      restOfCalldata = `0x${transaction.input.slice(2 + 2 * (4 + 32 + 32))}`;
      approvalTxHash = transaction.hash;
    }

    let intent: IntentERC20 | undefined;
    if (restOfCalldata && restOfCalldata.length > 2) {
      try {
        const intentTypes =
          "uint8, address, address, address, address, address, uint16, uint16, uint32, uint32, uint256, bool, uint128, uint128, uint16, uint16, bool, bytes";

        const result = decodeAbiParameters(
          parseAbiParameters(intentTypes),
          restOfCalldata
        );

        intent = {
          isBuy: Boolean(result[0]),
          buyToken: result[1].toLowerCase(),
          sellToken: result[2].toLowerCase(),
          maker: result[3].toLowerCase(),
          matchmaker: result[4].toLowerCase(),
          source: result[5].toLowerCase(),
          feeBps: result[6],
          surplusBps: result[7],
          startTime: result[8],
          endTime: result[9],
          nonce: result[10].toString(),
          isPartiallyFillable: result[11],
          amount: result[12],
          endAmount: result[13],
          startAmountBps: result[14],
          expectedAmountBps: result[15],
          hasDynamicSignature: result[16],
          signature: result[17].toLowerCase(),
        } as IntentERC20;
      } catch {
        // Skip errors
      }
    }

    if (intent) {
      const client = createPublicClient({
        chain,
        transport: http(process.env[`PONDER_RPC_URL_${chain.id}`]),
      });

      // Check the signature first
      const valid = await client.verifyTypedData({
        address: intent.maker as AddressType,
        domain: getEIP712Domain(chain.id, Protocol.ERC20),
        types: getEIP712TypesForIntent(Protocol.ERC20),
        primaryType: "Intent",
        message: intent,
        signature: intent.signature as AddressType,
      });

      if (!valid) {
        return;
      }

      const { Intent, Currency } = context.entities;

      const data = {
        isBuy: intent.isBuy,
        buyToken: intent.buyToken,
        sellToken: intent.sellToken,
        maker: intent.maker,
        matchmaker: intent.matchmaker,
        source: intent.source,
        feeBps: intent.feeBps,
        surplusBps: intent.surplusBps,
        startTime: intent.startTime,
        endTime: intent.endTime,
        isPartiallyFillable: intent.isPartiallyFillable,
        amount: intent.amount,
        endAmount: intent.endAmount,
        startAmountBps: intent.startAmountBps,
        expectedAmountBps: intent.expectedAmountBps,
        hasDynamicSignature: intent.hasDynamicSignature,
        signature: intent.signature,
      };

      const intentHash = await context.contracts.Memswap.read.getIntentHash([
        {
          isBuy: intent.isBuy,
          buyToken: intent.buyToken,
          sellToken: intent.sellToken,
          maker: intent.maker,
          matchmaker: intent.matchmaker,
          source: intent.source,
          feeBps: intent.feeBps,
          surplusBps: intent.surplusBps,
          startTime: intent.startTime,
          endTime: intent.endTime,
          isPartiallyFillable: intent.isPartiallyFillable,
          amount: intent.amount,
          endAmount: intent.endAmount,
          startAmountBps: intent.startAmountBps,
          expectedAmountBps: intent.expectedAmountBps,
          hasDynamicSignature: intent.hasDynamicSignature,
          signature: intent.signature,
        },
      ]);

      const { sellToken, buyToken } = await getTokenDetails(
        intent.sellToken,
        intent.buyToken,
        Currency
      );

      const existingIntent = await Intent.findUnique({
        id: intentHash,
      });

      await Intent.upsert({
        id: intentHash,
        create: {
          isBuy: intent.isBuy,
          sellToken: sellToken,
          buyToken: buyToken,
          maker: intent.maker,
          matchmaker: intent.matchmaker,
          source: intent.source,
          feeBps: intent.feeBps,
          surplusBps: intent.surplusBps,
          startTime: intent.startTime,
          endTime: intent.endTime,
          isPartiallyFillable: intent.isPartiallyFillable,
          amount: intent.amount,
          endAmount: intent.endAmount,
          startAmountBps: intent.startAmountBps,
          expectedAmountBps: intent.expectedAmountBps,
          isPreValidated: false,
          isCancelled: false,
          events: [transaction.hash],
          amountFilled: BigInt(0),
        },
        update: {
          events: existingIntent
            ? [transaction.hash, ...existingIntent.events]
            : undefined,
        },
      });
    }
  } catch (err) {}
};

export const getToken = async (address: `0x${string}`): Promise<Currency> => {
  const chain = MemswapChains[Number(process.env.ACTIVE_NETWORK)];

  if ([MEMSWAP_WETH[chain.id], zeroAddress].includes(address)) {
    return Ether.onChain(chain.id);
  }

  const client = createPublicClient({
    chain,
    transport: http(process.env[`PONDER_RPC_URL_${chain.id}`]),
  });

  const decimals = await client.readContract({
    abi: parseAbi(["function decimals() view returns (uint8)"]),
    address,
    functionName: "decimals",
  });

  // The core Uniswap SDK misses the WETH9 address for some chains (eg. Sepolia)
  if (!WETH9[chain.id]) {
    WETH9[chain.id] = new Token(
      chain.id,
      REGULAR_WETH[chain.id],
      decimals,
      "WETH",
      "Wrapped Ether"
    );
  }

  return new Token(chain.id, address, decimals);
};

export const getTokenDetails = async (
  sellTokenAddress: `0x${string}`,
  buyTokenAddress: `0x${string}`,
  Currency: Context["entities"]["Currency"]
): Promise<{ sellToken: string; buyToken: string }> => {
  const sellTokenInfo = await getToken(sellTokenAddress);

  if (!sellTokenInfo) {
    throw new Error("No token info");
  }

  const sellToken = await Currency.upsert({
    id: sellTokenAddress as string,
    create: {
      isNative: sellTokenInfo.isNative,
      isToken: sellTokenInfo.isToken,
      chainId: sellTokenInfo.chainId,
      decimals: sellTokenInfo.decimals,
      symbol: sellTokenInfo.symbol,
      name: sellTokenInfo.name,
      address: (sellTokenInfo as Token)?.address,
    },
    update: {},
  });

  const buyTokenInfo = await getToken(buyTokenAddress);

  if (!buyTokenInfo) {
    throw new Error("No token info");
  }

  const buyToken = await Currency.upsert({
    id: buyTokenAddress as string,
    create: {
      isNative: buyTokenInfo.isNative,
      isToken: buyTokenInfo.isToken,
      chainId: buyTokenInfo.chainId,
      decimals: buyTokenInfo.decimals,
      symbol: buyTokenInfo.symbol,
      name: buyTokenInfo.name,
      address: (buyTokenInfo as Token)?.address,
    },
    update: {},
  });

  return { sellToken: sellToken.id, buyToken: buyToken.id };
};
