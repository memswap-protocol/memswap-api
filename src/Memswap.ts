import { Intent, ponder } from "@/generated";
import {
  createPublicClient,
  decodeAbiParameters,
  decodeFunctionData,
  http,
  parseAbi,
  webSocket,
} from "viem";
import { goerli } from "viem/chains";
import { MEMSWAP, MEMSWAP_WETH } from "./common/constants";
import { MatchmakerIntent } from "./common/types";
import { getEIP712Domain, getEIP712TypesForIntent } from "./common/utils";

const chainId = 5;

const client = createPublicClient({
  chain: goerli,
  transport: http(process.env.PONDER_RPC_URL_5),
});

const wsClient = createPublicClient({
  chain: goerli,
  transport: webSocket(
    "wss://eth-goerli.g.alchemy.com/v2/GUfCLgSbyKS0V8fpzBSvR0YELTZ4Us7t"
  ),
});

wsClient.watchPendingTransactions({
  onTransactions: async (hashes) => {
    try {
      const txHash = hashes[0];

      const tx = await client.getTransaction({
        hash: txHash,
      });

      const intentTypes = [
        "address",
        "address",
        "address",
        "address",
        "address",
        "uint16",
        "uint16",
        "uint32",
        "bool",
        "uint128",
        "uint128",
        "uint16",
        "uint16",
        "bytes",
      ];

      // Try to decode any intent appended at the end of the calldata
      let restOfCalldata: `0x${string}` | undefined;
      let approvalTxHash: `0x${string}` | undefined;
      if (tx.input.startsWith("0x095ea7b3")) {
        const abiItem = parseAbi([
          "function approve(address spender, uint256 amount)",
        ]);

        const spender = decodeFunctionData({
          abi: abiItem,
          data: tx.input,
        }).args[0].toLowerCase();

        if (spender === MEMSWAP[chainId]) {
          restOfCalldata = `0x${tx.input.slice(2 + 2 * (4 + 32 + 32))}`;
          approvalTxHash = txHash;
        }
      } else if (
        tx.input.startsWith("0x28026ace") &&
        tx.to?.toLowerCase() === MEMSWAP_WETH[chainId]
      ) {
        const abiItem = parseAbi([
          "function depositAndApprove(address spender, uint256 amount)",
        ]);

        const spender = decodeFunctionData({
          abi: abiItem,
          data: tx.input,
        }).args[0].toLowerCase();
        if (spender === MEMSWAP[chainId]) {
          restOfCalldata = `0x${tx.input.slice(2 + 2 * (4 + 32 + 32))}`;
          approvalTxHash = txHash;
        }
      } else {
        restOfCalldata = tx.input;
      }

      let intent: MatchmakerIntent | undefined;
      if (restOfCalldata && restOfCalldata.length > 2) {
        try {
          const result: any[] = decodeAbiParameters(
            intentTypes,
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
          address: intent.maker,
          domain: getEIP712Domain(chainId),
          types: getEIP712TypesForIntent(),
          primaryType: "Intent",
          message: intent,
          signature: intent.signature,
        });
        if (!valid) {
          return;
        }

        console.log("Approved TX: ", tx);
      }
    } catch (err) {}
  },
});

ponder.on("Memswap:IntentCancelled", async ({ event, context }) => {
  console.log("IntentCancelled: ", event);
});

ponder.on("Memswap:IntentValidated", async ({ event, context }) => {
  console.log("IntentValidated: ", event);
});

ponder.on("Memswap:IntentPosted", async ({ event, context }) => {
  const intentPostedTx = decodeFunctionData({
    abi: context.contracts.Memswap.abi,
    data: event.transaction.input,
  });

  const { Intent } = context.entities;
  const intentPostedArgs = intentPostedTx.args;

  if (typeof intentPostedArgs?.[0] === "object") {
    const intentPostedInputs = intentPostedArgs[0];

    const intentHash = await client.readContract({
      ...context.contracts.Memswap,
      functionName: "getIntentHash",
      args: intentPostedArgs,
    });

    await Intent.create({
      id: intentHash,
      data: {
        tokenIn: intentPostedInputs.tokenIn,
        tokenOut: intentPostedInputs.tokenOut,
        maker: intentPostedInputs.maker,
        filler: intentPostedInputs.filler,
        referrer: intentPostedInputs.referrer,
        deadline: intentPostedInputs.deadline,
        isPartiallyFillable: intentPostedInputs.isPartiallyFillable,
        amountIn: intentPostedInputs.amountIn,
        startAmountOut: intentPostedInputs.startAmountOut,
        expectedAmountOut: intentPostedInputs.expectedAmountOut,
        endAmountOut: intentPostedInputs.endAmountOut,
        events: [event.transaction.hash],
        isCancelled: false,
        isValidated: false,
        amountFilled: BigInt(0),
      },
    });
  }
});

ponder.on("Memswap:IntentSolved", async ({ event, context }) => {
  const intentSolvedTx = decodeFunctionData({
    abi: context.contracts.Memswap.abi,
    data: event.transaction.input,
  });

  const { Intent } = context.entities;
  const intentSolvedArgs = intentSolvedTx.args;

  if (typeof intentSolvedArgs?.[0] === "object") {
    const intentSolvedInputs = intentSolvedArgs[0];

    const solvedIntent = await Intent.findUnique({
      id: event.params.intentHash,
    });

    if (solvedIntent) {
      await Intent.update({
        id: event.params.intentHash,
        data: {
          events: [...solvedIntent.events, event.transaction.hash],
          isValidated: true,
          amountFilled: event.params.amountOut,
        },
      });
    } else {
      await Intent.create({
        id: event.params.intentHash,
        data: {
          tokenIn: intentSolvedInputs.tokenIn,
          tokenOut: intentSolvedInputs.tokenOut,
          maker: intentSolvedInputs.maker,
          filler: intentSolvedInputs.filler,
          referrer: intentSolvedInputs.referrer,
          deadline: intentSolvedInputs.deadline,
          isPartiallyFillable: intentSolvedInputs.isPartiallyFillable,
          amountIn: intentSolvedInputs.amountIn,
          startAmountOut: intentSolvedInputs.startAmountOut,
          expectedAmountOut: intentSolvedInputs.expectedAmountOut,
          endAmountOut: intentSolvedInputs.endAmountOut,
          events: [event.transaction.hash],
          isCancelled: false,
          isValidated: true,
          amountFilled: event.params.amountOut,
        },
      });
    }
  }
});
