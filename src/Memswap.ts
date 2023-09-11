import { ponder } from "@/generated";
import { decodeFunctionData, encodeFunctionData } from "viem";
import { approvalCheck, getTokenDetails } from "./helpers";
import { IntentERC20 } from "./common/types";

ponder.on("Memswap:IntentsPosted", async ({ event, context }) => {
  const intentPostedTx = decodeFunctionData({
    abi: context.contracts.Memswap.abi,
    data: event.transaction.input,
  });

  const { Intent, Currency } = context.entities;
  const intentPostedArgs = intentPostedTx.args;

  if (typeof intentPostedArgs?.[0] === "object") {
    const intentPostedInputs: IntentERC20 = (intentPostedArgs[0] as any)[0];

    const intentHash = await context.contracts.Memswap.read.getIntentHash([
      intentPostedInputs,
    ]);

    const { sellToken, buyToken } = await getTokenDetails(
      intentPostedInputs.sellToken,
      intentPostedInputs.buyToken,
      Currency
    );

    await Intent.create({
      id: intentHash,
      data: {
        isBuy: intentPostedInputs.isBuy,
        sellToken: sellToken,
        buyToken: buyToken,
        maker: intentPostedInputs.maker,
        matchmaker: intentPostedInputs.matchmaker,
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
    });
  }
});

ponder.on("Memswap:IntentCancelled", async ({ event, context }) => {
  const intentCancelledTx = decodeFunctionData({
    abi: context.contracts.Memswap.abi,
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

    if (cancelledIntent) {
      await Intent.update({
        id: event.params.intentHash,
        data: {
          events: [...cancelledIntent.events, event.transaction.hash],
          isCancelled: true,
        },
      });
    } else {
      const { sellToken, buyToken } = await getTokenDetails(
        intentCancelledInputs.sellToken,
        intentCancelledInputs.buyToken,
        Currency
      );

      await Intent.create({
        id: event.params.intentHash,
        data: {
          isBuy: intentCancelledInputs.isBuy,
          sellToken: sellToken,
          buyToken: buyToken,
          maker: intentCancelledInputs.maker,
          matchmaker: intentCancelledInputs.matchmaker,
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
      });
    }
  }
});

ponder.on("Memswap:IntentSolved", async ({ event, context }) => {
  const intentSolvedTx = decodeFunctionData({
    abi: context.contracts.Memswap.abi,
    data: event.transaction.input,
  });

  const { Intent, Currency } = context.entities;
  const intentSolvedArgs = intentSolvedTx.args;

  if (typeof intentSolvedArgs?.[0] === "object") {
    const intentSolvedInputs: IntentERC20 = (intentSolvedArgs[0] as any)[0];

    const solvedIntent = await Intent.findUnique({
      id: event.params.intentHash,
    });

    const intentStatus = await context.contracts.Memswap.read.intentStatus([
      event.params.intentHash,
    ]);

    if (solvedIntent) {
      await Intent.update({
        id: event.params.intentHash,
        data: {
          events: [...solvedIntent.events, event.transaction.hash],
          isPreValidated: true,
          amountFilled: intentStatus[2],
        },
      });
    } else {
      const { sellToken, buyToken } = await getTokenDetails(
        event.params.sellToken,
        event.params.buyToken,
        Currency
      );

      await Intent.create({
        id: event.params.intentHash,
        data: {
          isBuy: intentSolvedInputs.isBuy,
          sellToken: sellToken,
          buyToken: buyToken,
          maker: intentSolvedInputs.maker,
          matchmaker: intentSolvedInputs.matchmaker,
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
      });
    }
  }
});

ponder.on("Approvals:Approval", async ({ event, context }) => {
  await approvalCheck(event.transaction, context);
});
