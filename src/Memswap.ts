import { ponder } from "@/generated";
import { decodeFunctionData } from "viem";
import { approvalCheck, approvalCheckERC721, getTokenDetails } from "./helpers";
import { IntentERC20, IntentERC721 } from "./common/types";

// ERC20
ponder.on("MemswapERC20:IntentsPosted", async ({ event, context }) => {
  const intentPostedTx = decodeFunctionData({
    abi: context.contracts.MemswapERC20.abi,
    data: event.transaction.input,
  });

  const { Intent, Currency } = context.entities;
  const intentPostedArgs = intentPostedTx.args;

  if (typeof intentPostedArgs?.[0] === "object") {
    const intentPostedInputs: IntentERC20 = (intentPostedArgs[0] as any)[0];

    const intentHash = await context.contracts.MemswapERC20.read.getIntentHash([
      intentPostedInputs,
    ]);

    const existingIntent = await Intent.findUnique({
      id: intentHash,
    });

    const { sellToken, buyToken } = await getTokenDetails(
      { address: intentPostedInputs.sellToken, nft: false },
      { address: intentPostedInputs.buyToken, nft: false },
      Currency
    );

    await Intent.upsert({
      id: intentHash,
      create: {
        isBuy: intentPostedInputs.isBuy,
        sellToken: sellToken,
        buyToken: buyToken,
        maker: intentPostedInputs.maker,
        solver: intentPostedInputs.solver,
        source: intentPostedInputs.source,
        feeBps: intentPostedInputs.feeBps,
        surplusBps: intentPostedInputs.surplusBps,
        startTime: intentPostedInputs.startTime,
        endTime: intentPostedInputs.endTime,
        isPartiallyFillable: intentPostedInputs.isPartiallyFillable,
        amount: intentPostedInputs.amount,
        endAmount: intentPostedInputs.endAmount,
        startAmountBps: intentPostedInputs.startAmountBps,
        expectedAmountBps: intentPostedInputs.expectedAmountBps,
        isPreValidated: false,
        isCancelled: false,
        events: [event.transaction.hash],
        amountFilled: BigInt(0),
      },
      update: {
        events: existingIntent
          ? [event.transaction.hash, ...existingIntent.events]
          : undefined,
      },
    });
  }
});

ponder.on("MemswapERC20:IntentCancelled", async ({ event, context }) => {
  const intentCancelledTx = decodeFunctionData({
    abi: context.contracts.MemswapERC20.abi,
    data: event.transaction.input,
  });

  const { Intent, Currency } = context.entities;
  const intentCancelledArgs = intentCancelledTx.args;

  if (typeof intentCancelledArgs?.[0] === "object") {
    const intentCancelledInputs: IntentERC20 = (
      intentCancelledArgs[0] as any
    )[0];

    const cancelledIntent = await Intent.findUnique({
      id: event.params.intentHash,
    });

    const { sellToken, buyToken } = await getTokenDetails(
      { address: intentCancelledInputs.sellToken, nft: false },
      { address: intentCancelledInputs.buyToken, nft: false },
      Currency
    );

    await Intent.upsert({
      id: event.params.intentHash,
      create: {
        isBuy: intentCancelledInputs.isBuy,
        sellToken: sellToken,
        buyToken: buyToken,
        maker: intentCancelledInputs.maker,
        solver: intentCancelledInputs.solver,
        source: intentCancelledInputs.source,
        feeBps: intentCancelledInputs.feeBps,
        surplusBps: intentCancelledInputs.surplusBps,
        startTime: intentCancelledInputs.startTime,
        endTime: intentCancelledInputs.endTime,
        isPartiallyFillable: intentCancelledInputs.isPartiallyFillable,
        amount: intentCancelledInputs.amount,
        endAmount: intentCancelledInputs.endAmount,
        startAmountBps: intentCancelledInputs.startAmountBps,
        expectedAmountBps: intentCancelledInputs.expectedAmountBps,
        isPreValidated: false,
        isCancelled: true,
        events: [event.transaction.hash],
        amountFilled: BigInt(0),
      },
      update: {
        events: cancelledIntent
          ? [...cancelledIntent.events, event.transaction.hash]
          : undefined,
        isCancelled: true,
      },
    });
  }
});

ponder.on("MemswapERC20:IntentSolved", async ({ event, context }) => {
  const intentSolvedTx = decodeFunctionData({
    abi: context.contracts.MemswapSolutionProxy.abi,
    data: event.transaction.input,
  });

  const { Intent, Currency } = context.entities;
  const intentSolvedArgs = intentSolvedTx.args;

  if (typeof intentSolvedArgs?.[0] === "object") {
    const intentSolvedInputs: IntentERC20 = intentSolvedArgs[0];

    const solvedIntent = await Intent.findUnique({
      id: event.params.intentHash,
    });

    const intentStatus = await context.contracts.MemswapERC20.read.intentStatus(
      [event.params.intentHash]
    );

    const { sellToken, buyToken } = await getTokenDetails(
      { address: event.params.sellToken, nft: false },
      { address: event.params.buyToken, nft: false },
      Currency
    );

    await Intent.upsert({
      id: event.params.intentHash,
      create: {
        isBuy: intentSolvedInputs.isBuy,
        sellToken: sellToken,
        buyToken: buyToken,
        maker: intentSolvedInputs.maker,
        solver: intentSolvedInputs.solver,
        source: intentSolvedInputs.source,
        feeBps: intentSolvedInputs.feeBps,
        surplusBps: intentSolvedInputs.surplusBps,
        startTime: intentSolvedInputs.startTime,
        endTime: intentSolvedInputs.endTime,
        isPartiallyFillable: intentSolvedInputs.isPartiallyFillable,
        amount: intentSolvedInputs.amount,
        endAmount: intentSolvedInputs.endAmount,
        startAmountBps: intentSolvedInputs.startAmountBps,
        expectedAmountBps: intentSolvedInputs.expectedAmountBps,
        isPreValidated: true,
        isCancelled: false,
        events: [event.transaction.hash],
        amountFilled: intentStatus[2],
      },
      update: {
        events: solvedIntent
          ? [...solvedIntent.events, event.transaction.hash]
          : undefined,
        isPreValidated: true,
        amountFilled: intentStatus[2],
      },
    });
  }
});

ponder.on("ApprovalsERC20:Approval", async ({ event, context }) => {
  await approvalCheck(event.transaction, context);
});

// ERC721
ponder.on("MemswapERC721:IntentsPosted", async ({ event, context }) => {
  const intentPostedTx = decodeFunctionData({
    abi: context.contracts.MemswapERC721.abi,
    data: event.transaction.input,
  });

  const { Intent, Currency } = context.entities;
  const intentPostedArgs = intentPostedTx.args;

  if (typeof intentPostedArgs?.[0] === "object") {
    const intentPostedInputs: IntentERC721 = (intentPostedArgs[0] as any)[0];

    const intentHash = await context.contracts.MemswapERC721.read.getIntentHash(
      [intentPostedInputs]
    );

    const existingIntent = await Intent.findUnique({
      id: intentHash,
    });

    const { sellToken, buyToken } = await getTokenDetails(
      {
        address: intentPostedInputs.sellToken,
        nft: !intentPostedInputs.isBuy,
      },
      { address: intentPostedInputs.buyToken, nft: intentPostedInputs.isBuy },
      Currency
    );

    await Intent.upsert({
      id: intentHash,
      create: {
        isBuy: intentPostedInputs.isBuy,
        sellToken: sellToken,
        buyToken: buyToken,
        maker: intentPostedInputs.maker,
        solver: intentPostedInputs.solver,
        source: intentPostedInputs.source,
        feeBps: intentPostedInputs.feeBps,
        surplusBps: intentPostedInputs.surplusBps,
        startTime: intentPostedInputs.startTime,
        endTime: intentPostedInputs.endTime,
        isPartiallyFillable: intentPostedInputs.isPartiallyFillable,
        amount: intentPostedInputs.amount,
        endAmount: intentPostedInputs.endAmount,
        startAmountBps: intentPostedInputs.startAmountBps,
        expectedAmountBps: intentPostedInputs.expectedAmountBps,
        isPreValidated: false,
        isCancelled: false,
        events: [event.transaction.hash],
        amountFilled: BigInt(0),
      },
      update: {
        events: existingIntent
          ? [event.transaction.hash, ...existingIntent.events]
          : undefined,
      },
    });
  }
});

ponder.on("MemswapERC721:IntentCancelled", async ({ event, context }) => {
  const intentCancelledTx = decodeFunctionData({
    abi: context.contracts.MemswapERC721.abi,
    data: event.transaction.input,
  });

  const { Intent, Currency } = context.entities;
  const intentCancelledArgs = intentCancelledTx.args;

  if (typeof intentCancelledArgs?.[0] === "object") {
    const intentCancelledInputs: IntentERC721 = (
      intentCancelledArgs[0] as any
    )[0];

    const cancelledIntent = await Intent.findUnique({
      id: event.params.intentHash,
    });

    const { sellToken, buyToken } = await getTokenDetails(
      {
        address: intentCancelledInputs.sellToken,
        nft: !intentCancelledInputs.isBuy,
      },
      {
        address: intentCancelledInputs.buyToken,
        nft: intentCancelledInputs.isBuy,
      },
      Currency
    );

    await Intent.upsert({
      id: event.params.intentHash,
      create: {
        isBuy: intentCancelledInputs.isBuy,
        sellToken: sellToken,
        buyToken: buyToken,
        maker: intentCancelledInputs.maker,
        solver: intentCancelledInputs.solver,
        source: intentCancelledInputs.source,
        feeBps: intentCancelledInputs.feeBps,
        surplusBps: intentCancelledInputs.surplusBps,
        startTime: intentCancelledInputs.startTime,
        endTime: intentCancelledInputs.endTime,
        isPartiallyFillable: intentCancelledInputs.isPartiallyFillable,
        amount: intentCancelledInputs.amount,
        endAmount: intentCancelledInputs.endAmount,
        startAmountBps: intentCancelledInputs.startAmountBps,
        expectedAmountBps: intentCancelledInputs.expectedAmountBps,
        isPreValidated: false,
        isCancelled: true,
        events: [event.transaction.hash],
        amountFilled: BigInt(0),
      },
      update: {
        events: cancelledIntent
          ? [...cancelledIntent.events, event.transaction.hash]
          : undefined,
        isCancelled: true,
      },
    });
  }
});

ponder.on("MemswapERC721:IntentSolved", async ({ event, context }) => {
  const intentSolvedTx = decodeFunctionData({
    abi: context.contracts.MemswapSolutionProxy.abi,
    data: event.transaction.input,
  });

  const { Intent, Currency } = context.entities;
  const intentSolvedArgs = intentSolvedTx.args;

  if (typeof intentSolvedArgs?.[0] === "object") {
    const intentSolvedInputs: IntentERC721 = intentSolvedArgs[0];

    const solvedIntent = await Intent.findUnique({
      id: event.params.intentHash,
    });

    const intentStatus =
      await context.contracts.MemswapERC721.read.intentStatus([
        event.params.intentHash,
      ]);

    const { sellToken, buyToken } = await getTokenDetails(
      { address: event.params.sellToken, nft: !event.params.isBuy },
      { address: event.params.buyToken, nft: event.params.isBuy },
      Currency
    );

    await Intent.upsert({
      id: event.params.intentHash,
      create: {
        isBuy: intentSolvedInputs.isBuy,
        sellToken: sellToken,
        buyToken: buyToken,
        maker: intentSolvedInputs.maker,
        solver: intentSolvedInputs.solver,
        source: intentSolvedInputs.source,
        feeBps: intentSolvedInputs.feeBps,
        surplusBps: intentSolvedInputs.surplusBps,
        startTime: intentSolvedInputs.startTime,
        endTime: intentSolvedInputs.endTime,
        isPartiallyFillable: intentSolvedInputs.isPartiallyFillable,
        amount: intentSolvedInputs.amount,
        endAmount: intentSolvedInputs.endAmount,
        startAmountBps: intentSolvedInputs.startAmountBps,
        expectedAmountBps: intentSolvedInputs.expectedAmountBps,
        isPreValidated: true,
        isCancelled: false,
        events: [event.transaction.hash],
        amountFilled: intentStatus[2],
      },
      update: {
        events: solvedIntent
          ? [...solvedIntent.events, event.transaction.hash]
          : undefined,
        isPreValidated: true,
        amountFilled: intentStatus[2],
      },
    });
  }
});

ponder.on("ApprovalsERC721:Approval", async ({ event, context }) => {
  await approvalCheckERC721(event.transaction, context);
});
