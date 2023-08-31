import { Context } from "@/generated";
import {
  PublicClient,
  Transport,
  decodeAbiParameters,
  decodeFunctionData,
  parseAbiParameters,
} from "viem";
import { Chain } from "viem/chains";
import { MEMSWAP, MEMSWAP_WETH } from "./common/constants";
import { AddressType, MatchmakerIntent } from "./common/types";
import { getEIP712Domain, getEIP712TypesForIntent } from "./common/utils";
import { Transaction } from "@ponder/core";

export const approvalCheck = async (
  transaction: Transaction,
  context: Context,
  client: PublicClient<Transport, Chain>,
  chainId: number
) => {
  try {
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
      (spender === MEMSWAP[chainId] || spender === MEMSWAP_WETH[chainId])
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
      // Check the signature first
      const valid = await client.verifyTypedData({
        address: intent.maker as AddressType,
        domain: getEIP712Domain(chainId),
        types: getEIP712TypesForIntent(),
        primaryType: "Intent",
        message: intent,
        signature: intent.signature as AddressType,
      });

      if (!valid) {
        return;
      }

      const { Intent } = context.entities;

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

      const existingIntent = await Intent.findUnique({
        id: intentHash,
      });

      await Intent.upsert({
        id: intentHash,
        create: {
          tokenIn: intent.tokenIn,
          tokenOut: intent.tokenOut,
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

      console.log("new intent: ", transaction.hash);
    }
  } catch (err) {}
};
