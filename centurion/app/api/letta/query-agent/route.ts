import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Configuration
const LETTA_API_BASE_URL = "http://34.162.165.188:8283/v1/agents/";
const AGENT_ID_FILE = path.join(process.cwd(), "letta-agent-id.txt");

export async function POST(request: NextRequest) {
  console.log("📋 [LETTA QUERY] Request received to query agent");

  try {
    // Get message from request
    const { message } = await request.json();

    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // Read agent ID from file
    let agentId;
    try {
      agentId = await fs.readFile(AGENT_ID_FILE, "utf-8");
      agentId = agentId.trim();
      console.log(`🔑 [LETTA QUERY] Using agent ID: ${agentId}`);
    } catch (error) {
      console.error("Error reading agent ID file:", error);
    }

    // Prepare payload
    const payload = {
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    };

    console.log(
      "📤 [LETTA QUERY] Sending message to agent:",
      JSON.stringify(payload, null, 2),
    );

    // Call the Letta API
    const response = await fetch(`${LETTA_API_BASE_URL}${agentId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `Failed to query agent. Status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = `${errorMessage}. Details: ${JSON.stringify(errorData)}`;
      } catch (e) {
        console.error("Error parsing error response:", e);
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status },
      );
    }

    // Parse and return the response
    const data = await response.json();
    console.log("✅ [LETTA QUERY] Received response from agent");

    return NextResponse.json({
      success: true,
      response: data,
    });
  } catch (error) {
    console.error("Error querying Letta agent:", error);
    return NextResponse.json(
      { error: "Failed to query agent", details: (error as Error).message },
      { status: 500 },
    );
  }
}
