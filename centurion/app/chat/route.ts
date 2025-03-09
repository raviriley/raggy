import {
  Message,
  NoSuchToolError,
  InvalidToolArgumentsError,
  ToolExecutionError,
  streamText,
  TextPart,
  tool,
  ToolCallPart,
  ToolResultPart,
} from "ai";
import { google } from "@ai-sdk/google";
import { NextRequest } from "next/server";
import { z } from "zod";
import { swapTokens } from "@/lib/actions/dex";
import { revalidatePath } from "next/cache";
import { findRelevantContent } from "@/lib/actions/rag";
import { FLARE_TOKENS } from "@/lib/config";

const tools = {
  connectUserWallet: tool({
    description: `give the user a button to connect their wallet.`,
    parameters: z.object({}),
    execute: async () => {
      console.log("connectUserWallet");
      return {
        type: "text",
        text: "Connect your wallet with this button to continue.",
      };
    },
  }),
  swapTokens: tool({
    description: `swap from one token to another using sparkdex, a decentralized exchange on the flare network. the tokens available to swap are: ${FLARE_TOKENS.map((t) => `${t.label} (${t.value})`).join(", ")}.`,
    parameters: z.object({
      token_in: z.string().describe("the token to swap"),
      token_out: z.string().describe("the token to receive"),
      amount_in: z.number().describe("the amount of tokens to swap"),
      wallet_to_swap_from: z.string().describe("the wallet to swap from"),
    }),
    execute: async ({ token_in, token_out, amount_in, wallet_to_swap_from }) =>
      swapTokens({ token_in, token_out, amount_in, wallet_to_swap_from }),
  }),
  getInformation: tool({
    description: `get information from your knowledge base to answer questions.`,
    parameters: z.object({
      question: z.string().describe("the users question"),
    }),
    execute: async ({ question }) => findRelevantContent(question),
  }),
};

export async function POST(req: NextRequest) {
  const { messages: messagesString, requestBody } = await req.json();
  const messages = JSON.parse(messagesString) as Message[];

  const isUserWalletConnected = requestBody.isUserWalletConnected;
  const userWallet = requestBody.userWallet;

  const systemPrompt = `
  You are a helpful assistant named Centurion that can answer questions about Flare and help with interactions with Flare apps.
  Always rely on looking up relevant information from your knowledge base to answer questions.

  You can also help with tasks such as token swaps, lending tokens, & borrowing tokens.

  When answering questions about token swaps or other blockchain interactions:

  ${
    isUserWalletConnected
      ? `The user's wallet is connected with address ${userWallet}. You can use this address to perform token swaps and other blockchain interactions on their behalf.`
      : `The user's wallet is not connected. If they want to do anything related to tokens or blockchain interactions, call the connectUserWallet tool and do not perform any other actions.`
  }

  For token swaps, use the swapTokens tool and provide the user's wallet address as the wallet_to_swap_from parameter.
  `;

  const model = google("gemini-2.0-pro-exp-02-05");
  console.log("latest message", messages[messages.length - 1]?.content);
  const result = streamText({
    model,
    toolChoice: "auto",
    maxSteps: 4,
    system: systemPrompt,
    messages,
    tools,
  });

  return result.toDataStreamResponse();
}
