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
  smoothStream,
} from "ai";
import { google } from "@ai-sdk/google";
import { NextRequest } from "next/server";
import { z } from "zod";
import { swapTokens } from "@/lib/actions/dex";
import { revalidatePath } from "next/cache";
import { findRelevantContent } from "@/lib/actions/rag";

const tools = {
  swapTokens: tool({
    description: `swap from one token to another using sparkdex, a decentralized exchange on the flare network.`,
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

const systemPrompt = `
You are a helpful assistant named Centurion that can answer questions about Flare and help with interactions with Flare apps.
Always rely on looking up relevant information from your knowledge base to answer questions.

You can also help with tasks such as token swaps, lending tokens, borrowing tokens, and storing data on-chain.
`;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const model = google("gemini-2.0-pro-exp-02-05");

  console.log("messages", messages);

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
