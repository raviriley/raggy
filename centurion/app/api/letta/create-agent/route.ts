import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Configuration
const LETTA_API_URL = "http://34.162.165.188:8283/v1/agents/";
const AGENT_ID_FILE = path.join(process.cwd(), "letta-agent-id.txt");

export async function POST(request: NextRequest) {
  console.log("📋 [LETTA CREATE] Request received to create a new agent");
  try {
    // Get agent configuration from request
    const { name, description } = await request.json();

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Agent name is required" },
        { status: 400 },
      );
    }

    // Prepare the agent creation payload with the correct field name
    const payload = {
      name,
      agent_type: "memgpt_agent",
      description:
        description ||
        `Transaction analysis agent created on ${new Date().toISOString()}`,
      model: "openai/gpt-4o-mini",
      embedding: "openai/text-embedding-ada-002",
    };

    console.log(
      "📤 [LETTA CREATE] Creating agent with payload:",
      JSON.stringify(payload, null, 2),
    );

    // Call the Letta API
    const response = await fetch(LETTA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `Failed to create agent. Status: ${response.status}`;
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

    // Directly write the agent ID to the file
    try {
      await fs.writeFile(AGENT_ID_FILE, data.id);
      console.log(`💾 [LETTA CREATE] Agent ID ${data.id} written to file`);
    } catch (error) {
      console.error("Error writing agent ID to file:", error);
    }

    console.log(
      `✅ [LETTA CREATE] Agent created successfully with ID: ${data.id}`,
    );

    return NextResponse.json({
      success: true,
      agent: data,
    });
  } catch (error) {
    console.error("Error creating Letta agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent", details: (error as Error).message },
      { status: 500 },
    );
  }
}
