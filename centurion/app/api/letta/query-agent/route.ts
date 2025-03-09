import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Configuration
const LETTA_BASE_URL = "http://34.162.165.188:8283/v1/agents/";
const AGENT_ID_FILE = path.join(process.cwd(), "letta-agent-id.txt");

export async function POST(request: NextRequest) {
  console.log("📋 [LETTA QUERY] Request received");

  try {
    const { message, agentId: requestedAgentId } = await request.json();
    console.log(
      `📝 [LETTA QUERY] Processing message: "${message.substring(0, 50)}${message.length > 50 ? "..." : ""}"`,
    );

    // Check if message is provided
    if (!message) {
      console.log("❌ [LETTA QUERY] No message provided in request");
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // If agentId was provided in the request, use it directly
    let agentId = requestedAgentId;

    // If no agentId was provided, try to read from the file
    if (!agentId) {
      try {
        agentId = await fs.readFile(AGENT_ID_FILE, "utf-8");
        // Trim any whitespace or newlines
        agentId = agentId.trim();
        console.log(`🔍 [LETTA QUERY] Read agent ID from file: ${agentId}`);
      } catch (error) {
        console.log("❌ [LETTA QUERY] Failed to read agent ID file", error);
        return NextResponse.json(
          {
            error:
              "No agent ID found. Please create and store an agent ID first.",
            details: `Error reading file: ${(error as Error).message}`,
          },
          { status: 404 },
        );
      }
    }

    // Set up the streaming endpoint URL
    const streamingEndpoint = `${LETTA_BASE_URL}${agentId}/messages/stream`;
    console.log(
      `🔌 [LETTA QUERY] Using streaming endpoint: ${streamingEndpoint}`,
    );

    // Prepare the messages payload
    const payload = {
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
      stream_tokens: true, // Enable token streaming
    };
    console.log(`📤 [LETTA QUERY] Sending payload to Letta API`);

    // Make the streaming request to Letta API
    const response = await fetch(streamingEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(payload),
    });

    // Check if the response is successful
    if (!response.ok) {
      let errorMessage = `Failed to stream from agent. Status: ${response.status}`;
      try {
        const errorData = await response.text();
        errorMessage = `${errorMessage}. Details: ${errorData}`;
        console.log(`❌ [LETTA QUERY] API request failed: ${errorMessage}`);
      } catch (e) {
        // If we can't parse the error, just use the original error message
        console.log(
          `❌ [LETTA QUERY] API request failed with status ${response.status}`,
        );
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status },
      );
    }

    console.log(`✅ [LETTA QUERY] Successfully connected to streaming API`);

    // Process the streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          console.log(`❌ [LETTA QUERY] No reader available in response`);
          controller.close();
          return;
        }

        let accumulatedAssistantMessage = "";
        let chunkCount = 0;
        let eventCount = 0;

        console.log(`🔄 [LETTA QUERY] Beginning to process stream`);

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log(
                `✅ [LETTA QUERY] Stream completed after ${chunkCount} chunks and ${eventCount} events`,
              );
              controller.close();
              break;
            }

            chunkCount++;

            // Convert the byte stream to text
            const chunk = new TextDecoder().decode(value);
            console.log(
              `📦 [LETTA QUERY] Received chunk #${chunkCount} (${value.length} bytes)`,
            );

            // Process the SSE format
            const lines = chunk
              .split("\n")
              .filter((line) => line.trim() !== "");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                eventCount++;
                try {
                  const jsonData = JSON.parse(line.slice(6)); // Remove 'data: ' prefix

                  // Extract assistant messages
                  if (jsonData.messages) {
                    for (const msg of jsonData.messages) {
                      if (
                        msg.message_type === "assistant_message" &&
                        msg.content
                      ) {
                        // Extract just the new content that was added
                        const newContent = msg.content.slice(
                          accumulatedAssistantMessage.length,
                        );
                        accumulatedAssistantMessage = msg.content;

                        if (newContent.length > 0) {
                          console.log(
                            `💬 [LETTA QUERY] Assistant message update: "${newContent.substring(0, 30)}${newContent.length > 30 ? "..." : ""}"`,
                          );
                          // Send just the new content to the client
                          controller.enqueue(
                            new TextEncoder().encode(newContent),
                          );
                        }
                      } else if (msg.message_type === "reasoning_message") {
                        console.log(
                          `🧠 [LETTA QUERY] Agent reasoning: "${msg.reasoning?.substring(0, 30)}${msg.reasoning?.length > 30 ? "..." : ""}"`,
                        );
                      }
                    }
                  }

                  // Handle token streaming
                  if (jsonData.delta && jsonData.delta.content) {
                    console.log(
                      `🔤 [LETTA QUERY] Token delta: "${jsonData.delta.content}"`,
                    );
                    controller.enqueue(
                      new TextEncoder().encode(jsonData.delta.content),
                    );
                  }
                } catch (e) {
                  console.error("❌ [LETTA QUERY] Error parsing SSE data:", e);
                }
              }
            }
          }
        } catch (error) {
          console.error("❌ [LETTA QUERY] Error reading stream:", error);
          controller.error(error);
        }
      },
    });

    console.log(`🚀 [LETTA QUERY] Returning streaming response to client`);
    // Return a streaming response
    return stream;
  } catch (error) {
    console.error("❌ [LETTA QUERY] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to query agent", details: (error as Error).message },
      { status: 500 },
    );
  }
}
