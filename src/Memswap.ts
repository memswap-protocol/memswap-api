import { ponder } from "@/generated";
import {
  createPublicClient,
  decodeAbiParameters,
  decodeFunctionData,
  http,
  parseAbiParameters,
} from "viem";
import { approvalCheck, approvalCheckERC721, getTokenDetails } from "./helpers";
import { IntentERC20, IntentERC721 } from "./common/types";
import { mainnet } from "viem/chains";

/* ponder.on("setup", async ({ context }) => {
  const client = createPublicClient({
    chain: mainnet,
    transport: http(process.env[`PONDER_RPC_URL_1`]),
  });

  const tx = await client.getTransaction({
    hash: "0x09a16581eb8ea3b2602ffbb8b15094c543b960f386d1d28cb30134fc6aabdb71",
  });

  const restOfCalldata: `0x${string}` = `0x${tx.input.slice(
    2 + 2 * (4 + 32 + 32)
  )}`;

  const intentTypes =
    "bool, address, address, address, address, address, uint16, uint16, uint32, uint32, bool, bool, bool, uint256, uint128, uint128, uint16, uint16, bytes";

  const result = decodeAbiParameters(
    parseAbiParameters(intentTypes),
    restOfCalldata
  );

  const intent = {
    isBuy: result[0],
    buyToken: result[1].toLowerCase(),
    sellToken: result[2].toLowerCase(),
    maker: result[3].toLowerCase(),
    solver: result[4].toLowerCase(),
    source: result[5].toLowerCase(),
    feeBps: result[6],
    surplusBps: result[7],
    startTime: result[8],
    endTime: result[9],
    isPartiallyFillable: result[10],
    isSmartOrder: result[11],
    isCriteriaOrder: result[12],
    tokenIdOrCriteria: result[13],
    amount: result[14],
    endAmount: result[15],
    startAmountBps: result[16],
    expectedAmountBps: result[17],
    signature: result[18].toLowerCase(),
  } as IntentERC721;

  console.log(intent);
}); */

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

    const { sellToken, buyToken } = await getTokenDetails(
      { address: intentPostedInputs.sellToken, nft: false },
      { address: intentPostedInputs.buyToken, nft: false },
      Currency
    );

    await Intent.create({
      id: intentHash,
      data: {
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
        { address: intentCancelledInputs.sellToken, nft: false },
        { address: intentCancelledInputs.buyToken, nft: false },
        Currency
      );

      await Intent.create({
        id: event.params.intentHash,
        data: {
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
      });
    }
  }
});

ponder.on("MemswapERC20:IntentSolved", async ({ event, context }) => {
  const intentSolvedTx = decodeFunctionData({
    abi: context.contracts.MemswapERC20.abi,
    data: event.transaction.input,
  });

  const { Intent, Currency } = context.entities;
  const intentSolvedArgs = intentSolvedTx.args;

  if (typeof intentSolvedArgs?.[0] === "object") {
    const intentSolvedInputs: IntentERC20 = (intentSolvedArgs[0] as any)[0];

    const solvedIntent = await Intent.findUnique({
      id: event.params.intentHash,
    });

    const intentStatus = await context.contracts.MemswapERC20.read.intentStatus(
      [event.params.intentHash]
    );

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
        { address: event.params.sellToken, nft: false },
        { address: event.params.buyToken, nft: false },
        Currency
      );

      await Intent.create({
        id: event.params.intentHash,
        data: {
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
      });
    }
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

    const { sellToken, buyToken } = await getTokenDetails(
      { address: intentPostedInputs.sellToken, nft: !intentPostedInputs.isBuy },
      { address: intentPostedInputs.buyToken, nft: intentPostedInputs.isBuy },
      Currency
    );

    await Intent.create({
      id: intentHash,
      data: {
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

      await Intent.create({
        id: event.params.intentHash,
        data: {
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
      });
    }
  }
});

ponder.on("MemswapERC721:IntentSolved", async ({ event, context }) => {
  const intentSolvedTx = decodeFunctionData({
    abi: context.contracts.MemswapERC721.abi,
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
        { address: event.params.sellToken, nft: !event.params.isBuy },
        { address: event.params.buyToken, nft: event.params.isBuy },
        Currency
      );

      await Intent.create({
        id: event.params.intentHash,
        data: {
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
      });
    }
  }
});

ponder.on("ApprovalsERC721:Approval", async ({ event, context }) => {
  await approvalCheckERC721(event.transaction, context);
});
