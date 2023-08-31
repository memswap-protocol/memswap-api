import { ponder } from "@/generated";
import { createPublicClient, decodeFunctionData, http, webSocket } from "viem";
import { memswapTxCheck } from "./helpers";
import { CHAINS } from "./common/constants";

/* ponder.on("setup", async ({ context }) => {
  for (const chain of Object.values(CHAINS)) {
    const rpcClient = createPublicClient({
      chain: chain.chain,
      transport: http(chain.rpcUrl),
    });

    const wsClient = createPublicClient({
      chain: chain.chain,
      transport: webSocket(chain.wsUrl),
    });

    wsClient.watchPendingTransactions({
      onTransactions: async (hashes) => {
        try {
          const txHash = hashes[0];

          memswapTxCheck(rpcClient, txHash, context);
        } catch (err) {}
      },
    });
  }
}); */

ponder.on("Memswap:IntentPosted", async ({ event, context }) => {
  const intentPostedTx = decodeFunctionData({
    abi: context.contracts.Memswap.abi,
    data: event.transaction.input,
  });

  const { Intent } = context.entities;
  const intentPostedArgs = intentPostedTx.args;

  if (typeof intentPostedArgs?.[0] === "object") {
    const intentPostedInputs = intentPostedArgs[0];

    const intentHash = await context.contracts.Memswap.read.getIntentHash(
      intentPostedArgs
    );

    await Intent.create({
      id: intentHash,
      data: {
        tokenIn: intentPostedInputs.tokenIn,
        tokenOut: intentPostedInputs.tokenOut,
        maker: intentPostedInputs.maker,
        matchmaker: intentPostedInputs.matchmaker,
        deadline: intentPostedInputs.deadline,
        isPartiallyFillable: intentPostedInputs.isPartiallyFillable,
        amountIn: intentPostedInputs.amountIn,
        endAmountOut: intentPostedInputs.endAmountOut,
        events: [event.transaction.hash],
        isCancelled: false,
        isValidated: false,
        amountFilled: BigInt(0),
      },
    });
  }
});

ponder.on("Memswap:IntentCancelled", async ({ event, context }) => {
  const intentCancelledTx = decodeFunctionData({
    abi: context.contracts.Memswap.abi,
    data: event.transaction.input,
  });

  const { Intent } = context.entities;
  const intentCancelledArgs = intentCancelledTx.args;

  if (typeof intentCancelledArgs?.[0] === "object") {
    const intentCancelledInputs = intentCancelledArgs[0];

    const cancelledIntent = await Intent.findUnique({
      id: event.params.intentHash,
    });

    if (cancelledIntent) {
      await Intent.update({
        id: event.params.intentHash,
        data: {
          events: [...cancelledIntent.events, event.transaction.hash],
          isCancelled: true,
        },
      });
    } else {
      await Intent.create({
        id: event.params.intentHash,
        data: {
          tokenIn: intentCancelledInputs.tokenIn,
          tokenOut: intentCancelledInputs.tokenOut,
          maker: intentCancelledInputs.maker,
          matchmaker: intentCancelledInputs.matchmaker,
          deadline: intentCancelledInputs.deadline,
          isPartiallyFillable: intentCancelledInputs.isPartiallyFillable,
          amountIn: intentCancelledInputs.amountIn,
          endAmountOut: intentCancelledInputs.endAmountOut,
          events: [event.transaction.hash],
          isCancelled: true,
          isValidated: false,
          amountFilled: BigInt(0),
        },
      });
    }
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
          matchmaker: intentSolvedInputs.matchmaker,
          deadline: intentSolvedInputs.deadline,
          isPartiallyFillable: intentSolvedInputs.isPartiallyFillable,
          amountIn: intentSolvedInputs.amountIn,
          endAmountOut: intentSolvedInputs.endAmountOut,
          events: [event.transaction.hash],
          isCancelled: false,
          isValidated: true,
          amountFilled: intentSolvedInputs.amountIn,
        },
      });
    }
  }
});
