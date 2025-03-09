import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Configuration
const AGENT_ID_FILE = path.join(process.cwd(), "letta-agent-id.txt");

export async function POST(request: NextRequest) {
  try {
    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 },
      );
    }

    // Store the agent ID in a file
    await fs.writeFile(AGENT_ID_FILE, agentId);

    return NextResponse.json({
      success: true,
      agentId,
      message: "Agent ID stored successfully",
    });
  } catch (error) {
    console.error("Error storing agent ID:", error);
    return NextResponse.json(
      { error: "Failed to store agent ID", details: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    // Read the agent ID from the file
    const agentId = await fs.readFile(AGENT_ID_FILE, "utf-8");

    return NextResponse.json({
      success: true,
      agentId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "No agent ID found", details: (error as Error).message },
      { status: 404 },
    );
  }
}
