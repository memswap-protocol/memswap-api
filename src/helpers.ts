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
  MEMSWAP_ERC721,
  MEMSWAP_WETH,
  MemswapChains,
  REGULAR_WETH,
  RESERVOIR_API_URL,
} from "./common/constants";
import {
  AddressType,
  IntentERC20Approval,
  IntentERC721Approval,
  Protocol,
} from "./common/types";
import { getEIP712Domain, getEIP712TypesForIntent } from "./common/utils";
import { Transaction } from "@ponder/core";
import { Currency, WETH9, Token, Ether } from "@uniswap/sdk-core";
import axios from "axios";

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

    let intent: IntentERC20Approval | undefined;
    if (restOfCalldata && restOfCalldata.length > 2) {
      try {
        const intentTypes =
          "bool, address, address, address, address, address, uint16, uint16, uint32, uint32, bool, bool, bool, uint128, uint128, uint16, uint16, bytes";

        const result = decodeAbiParameters(
          parseAbiParameters(intentTypes),
          restOfCalldata
        );

        intent = {
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
          nonce: BigInt(0),
          isPartiallyFillable: result[10],
          isSmartOrder: result[11],
          isIncentivized: result[12],
          amount: result[13],
          endAmount: result[14],
          startAmountBps: result[15],
          expectedAmountBps: result[16],
          signature: result[17].toLowerCase(),
        } as IntentERC20Approval;
      } catch (err) {
        // console.log(err);
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
        throw new Error("Invalid ERC20 intent found");
      }

      const { Intent, Currency } = context.entities;

      const intentHash =
        await context.contracts.MemswapERC20.read.getIntentHash([
          {
            isBuy: intent.isBuy,
            buyToken: intent.buyToken,
            sellToken: intent.sellToken,
            maker: intent.maker,
            solver: intent.solver,
            source: intent.source,
            feeBps: intent.feeBps,
            surplusBps: intent.surplusBps,
            startTime: intent.startTime,
            endTime: intent.endTime,
            isPartiallyFillable: intent.isPartiallyFillable,
            isSmartOrder: intent.isSmartOrder,
            isIncentivized: intent.isIncentivized,
            amount: BigInt(intent.amount),
            endAmount: BigInt(intent.endAmount),
            startAmountBps: intent.startAmountBps,
            expectedAmountBps: intent.expectedAmountBps,
            signature: intent.signature,
          },
        ]);

      const { sellToken, buyToken } = await getTokenDetails(
        { address: intent.sellToken, nft: false },
        { address: intent.buyToken, nft: false },
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
          solver: intent.solver,
          source: intent.source,
          feeBps: intent.feeBps,
          surplusBps: intent.surplusBps,
          startTime: intent.startTime,
          endTime: intent.endTime,
          isPartiallyFillable: intent.isPartiallyFillable,
          amount: BigInt(intent.amount),
          endAmount: BigInt(intent.endAmount),
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
  } catch (err) {
    console.log("approvalCheckERC20 Error: ", err);
  }
};

export const approvalCheckERC721 = async (
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
      (spender === MEMSWAP_ERC721[chain.id] ||
        spender === MEMSWAP_WETH[chain.id])
    ) {
      restOfCalldata = `0x${transaction.input.slice(2 + 2 * (4 + 32 + 32))}`;
      approvalTxHash = transaction.hash;
    }

    let intent: IntentERC721Approval | undefined;
    if (restOfCalldata && restOfCalldata.length > 2) {
      try {
        const intentTypes =
          "bool, address, address, address, address, address, uint16, uint16, uint32, uint32, bool, bool, bool, bool, uint256, uint128, uint128, uint16, uint16, bytes";

        const result = decodeAbiParameters(
          parseAbiParameters(intentTypes),
          restOfCalldata
        );

        intent = {
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
          nonce: BigInt(0),
          isPartiallyFillable: result[10],
          isSmartOrder: result[11],
          isIncentivized: result[12],
          isCriteriaOrder: result[13],
          tokenIdOrCriteria: result[14],
          amount: result[15],
          endAmount: result[16],
          startAmountBps: result[17],
          expectedAmountBps: result[18],
          signature: result[19].toLowerCase(),
        } as IntentERC721Approval;
      } catch {
        // Skip errors
      }
    }

    if (intent) {
      const client = createPublicClient({
        chain,
        transport: http(process.env[`PONDER_RPC_URL_${chain.id}`]),
      });

      const valid = await client.verifyTypedData({
        address: intent.maker as AddressType,
        domain: getEIP712Domain(chain.id, Protocol.ERC721),
        types: getEIP712TypesForIntent(Protocol.ERC721),
        primaryType: "Intent",
        message: intent,
        signature: intent.signature as AddressType,
      });

      if (!valid) {
        throw new Error("Invalid ERC721 intent found");
      }

      const { Intent, Currency } = context.entities;

      const intentHash =
        await context.contracts.MemswapERC721.read.getIntentHash([
          {
            isBuy: intent.isBuy,
            buyToken: intent.buyToken,
            sellToken: intent.sellToken,
            maker: intent.maker,
            solver: intent.solver,
            source: intent.source,
            feeBps: intent.feeBps,
            surplusBps: intent.surplusBps,
            startTime: intent.startTime,
            endTime: intent.endTime,
            isPartiallyFillable: intent.isPartiallyFillable,
            isIncentivized: intent.isIncentivized,
            isSmartOrder: intent.isSmartOrder,
            isCriteriaOrder: intent.isCriteriaOrder,
            tokenIdOrCriteria: BigInt(intent.tokenIdOrCriteria),
            amount: BigInt(intent.amount),
            endAmount: BigInt(intent.endAmount),
            startAmountBps: intent.startAmountBps,
            expectedAmountBps: intent.expectedAmountBps,
            signature: intent.signature,
          },
        ]);

      const { sellToken, buyToken } = await getTokenDetails(
        { address: intent.sellToken, nft: !intent.isBuy },
        { address: intent.buyToken, nft: intent.isBuy },
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
          solver: intent.solver,
          source: intent.source,
          feeBps: intent.feeBps,
          surplusBps: intent.surplusBps,
          startTime: intent.startTime,
          endTime: intent.endTime,
          isPartiallyFillable: intent.isPartiallyFillable,
          amount: BigInt(intent.amount),
          endAmount: BigInt(intent.endAmount),
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
  } catch (err) {
    console.log("approvalCheckERC721 Error: ", err);
  }
};

export const getToken = async (address: `0x${string}`): Promise<Currency> => {
  const chain = MemswapChains[Number(process.env.ACTIVE_NETWORK)];

  let decimals = 0;
  let symbol = "";
  let name = "";

  if ([MEMSWAP_WETH[chain.id], zeroAddress].includes(address)) {
    return Ether.onChain(chain.id);
  }

  const client = createPublicClient({
    chain,
    transport: http(process.env[`PONDER_RPC_URL_${chain.id}`]),
  });

  const getDecimals = async (): Promise<void> => {
    try {
      decimals = await client.readContract({
        abi: parseAbi(["function decimals() view returns (uint8)"]),
        address,
        functionName: "decimals",
      });
    } catch (err) {}
  };

  const getSymbol = async () => {
    try {
      symbol = await client.readContract({
        abi: parseAbi(["function symbol() view returns (string)"]),
        address,
        functionName: "symbol",
      });
    } catch (err) {}
  };

  const getName = async () => {
    try {
      name = await client.readContract({
        abi: parseAbi(["function name() view returns (string)"]),
        address,
        functionName: "name",
      });
    } catch (err) {}
  };

  await Promise.allSettled([getDecimals(), getSymbol(), getName()]);

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

  return new Token(chain.id, address, decimals, symbol, name);
};

export const getTokenDetails = async (
  sellTokenDetails: { address: `0x${string}`; nft: boolean },
  buyTokenDetails: { address: `0x${string}`; nft: boolean },
  Currency: Context["entities"]["Currency"]
): Promise<{ sellToken: string; buyToken: string }> => {
  const sellTokenInfo = await getToken(sellTokenDetails.address);
  let sellTokenIcon = "";

  try {
    if (sellTokenDetails.nft) {
      const {
        data: { collections },
      } = await axios.get(
        `${
          RESERVOIR_API_URL[Number(process.env.ACTIVE_NETWORK)]
        }/collections/v7?id=${sellTokenDetails.address}`,
        { headers: { "x-api-key": process.env.RESERVOIR_API_KEY } }
      );
      sellTokenIcon = collections[0].image ?? "";
    } else {
      const data = await axios.get(
        `${
          RESERVOIR_API_URL[Number(process.env.ACTIVE_NETWORK)]
        }/redirect/currency/${sellTokenDetails.address}/icon/v1`,
        { headers: { "x-api-key": process.env.RESERVOIR_API_KEY } }
      );
      sellTokenIcon = data.request.res.responseUrl ?? "";
    }
  } catch (err) {}

  if (!sellTokenInfo) {
    throw new Error("No token info");
  }

  const sellToken = await Currency.upsert({
    id: sellTokenDetails.address as string,
    create: {
      isNative: sellTokenInfo.isNative,
      isToken: sellTokenInfo.isToken,
      chainId: sellTokenInfo.chainId,
      decimals: sellTokenInfo.decimals,
      symbol: sellTokenInfo.symbol,
      name: sellTokenInfo.name,
      address: (sellTokenInfo as Token)?.address,
      icon: sellTokenIcon,
    },
    update: {},
  });

  const buyTokenInfo = await getToken(buyTokenDetails.address);
  let buyTokenIcon = "";

  try {
    if (buyTokenDetails.nft) {
      const {
        data: { collections },
      } = await axios.get(
        `${
          RESERVOIR_API_URL[Number(process.env.ACTIVE_NETWORK)]
        }/collections/v7?id=${buyTokenDetails.address}`,
        { headers: { "x-api-key": process.env.RESERVOIR_API_KEY } }
      );
      buyTokenIcon = collections[0].image ?? "";
    } else {
      const data = await axios.get(
        `${
          RESERVOIR_API_URL[Number(process.env.ACTIVE_NETWORK)]
        }/redirect/currency/${buyTokenDetails.address}/icon/v1`,
        { headers: { "x-api-key": process.env.RESERVOIR_API_KEY } }
      );
      buyTokenIcon = data.request.res.responseUrl ?? "";
    }
  } catch (err) {}

  if (!buyTokenInfo) {
    throw new Error("No token info");
  }

  const buyToken = await Currency.upsert({
    id: buyTokenDetails.address as string,
    create: {
      isNative: buyTokenInfo.isNative,
      isToken: buyTokenInfo.isToken,
      chainId: buyTokenInfo.chainId,
      decimals: buyTokenInfo.decimals,
      symbol: buyTokenInfo.symbol,
      name: buyTokenInfo.name,
      address: (buyTokenInfo as Token)?.address,
      icon: buyTokenIcon,
    },
    update: {},
  });

  return { sellToken: sellToken.id, buyToken: buyToken.id };
};
