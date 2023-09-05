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
  MEMSWAP,
  MEMSWAP_WETH,
  MemswapChains,
  REGULAR_WETH,
} from "./common/constants";
import { AddressType, MatchmakerIntent } from "./common/types";
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
      (spender === MEMSWAP[chain.id] || spender === MEMSWAP_WETH[chain.id])
    ) {
      restOfCalldata = `0x${transaction.input.slice(2 + 2 * (4 + 32 + 32))}`;
      approvalTxHash = transaction.hash;
    }

    let intent: MatchmakerIntent | undefined;
    if (restOfCalldata && restOfCalldata.length > 2) {
      try {
        const intentTypes =
          "address, address, address, address, address, uint16, uint16, uint32, bool, uint128, uint128, uint16, uint16, bytes";

        const result = decodeAbiParameters(
          parseAbiParameters(intentTypes),
          restOfCalldata
        );

        intent = {
          tokenIn: result[0].toLowerCase(),
          tokenOut: result[1].toLowerCase(),
          maker: result[2].toLowerCase(),
          matchmaker: result[3].toLowerCase(),
          source: result[4].toLowerCase(),
          feeBps: result[5],
          surplusBps: result[6],
          deadline: result[7],
          isPartiallyFillable: result[8],
          amountIn: result[9].toString(),
          endAmountOut: result[10].toString(),
          startAmountBps: result[11],
          expectedAmountBps: result[12],
          signature: result[13].toLowerCase(),
        };
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
        domain: getEIP712Domain(chain.id),
        types: getEIP712TypesForIntent(),
        primaryType: "Intent",
        message: intent,
        signature: intent.signature as AddressType,
      });

      if (!valid) {
        return;
      }

      const { Intent, Currency } = context.entities;

      const intentHash = await client.readContract({
        ...context.contracts.Memswap,
        functionName: "getIntentHash",
        args: [
          {
            tokenIn: intent.tokenIn as AddressType,
            tokenOut: intent.tokenOut as AddressType,
            maker: intent.maker as AddressType,
            matchmaker: intent.matchmaker as AddressType,
            source: intent.source as AddressType,
            feeBps: intent.feeBps,
            surplusBps: intent.surplusBps,
            deadline: intent.deadline,
            isPartiallyFillable: intent.isPartiallyFillable,
            amountIn: BigInt(intent.amountIn),
            endAmountOut: BigInt(intent.endAmountOut),
            startAmountBps: intent.startAmountBps,
            expectedAmountBps: intent.expectedAmountBps,
            signature: intent.signature as AddressType,
          },
        ],
      });

      const { tokenIn, tokenOut } = await getTokenDetails(
        intent.tokenIn as `0x${string}`,
        intent.tokenOut as `0x${string}`,
        Currency
      );

      const existingIntent = await Intent.findUnique({
        id: intentHash,
      });

      await Intent.upsert({
        id: intentHash,
        create: {
          tokenIn: tokenIn,
          tokenOut: tokenOut,
          maker: intent.maker,
          matchmaker: intent.matchmaker,
          deadline: intent.deadline,
          isPartiallyFillable: intent.isPartiallyFillable,
          amountIn: BigInt(intent.amountIn),
          endAmountOut: BigInt(intent.endAmountOut),
          events: [transaction.hash],
          isCancelled: false,
          isValidated: false,
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
  tokenInAddress: `0x${string}`,
  tokenOutAddress: `0x${string}`,
  Currency: Context["entities"]["Currency"]
): Promise<{ tokenIn: string; tokenOut: string }> => {
  const tokenInInfo = await getToken(tokenInAddress);

  const tokenIn = await Currency.upsert({
    id: tokenInAddress as string,
    create: {
      isNative: tokenInInfo.isNative,
      isToken: tokenInInfo.isToken,
      chainId: tokenInInfo.chainId,
      decimals: tokenInInfo.decimals,
      symbol: tokenInInfo.symbol,
      name: tokenInInfo.name,
      address: (tokenInInfo as Token)?.address,
    },
    update: {},
  });

  const tokenOutInfo = await getToken(tokenOutAddress);

  const tokenOut = await Currency.upsert({
    id: tokenOutAddress as string,
    create: {
      isNative: tokenOutInfo.isNative,
      isToken: tokenOutInfo.isToken,
      chainId: tokenOutInfo.chainId,
      decimals: tokenOutInfo.decimals,
      symbol: tokenOutInfo.symbol,
      name: tokenOutInfo.name,
      address: (tokenOutInfo as Token)?.address,
    },
    update: {},
  });

  return { tokenIn: tokenIn.id, tokenOut: tokenOut.id };
};
