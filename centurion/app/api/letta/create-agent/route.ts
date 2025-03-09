import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Configuration
const LETTA_API_URL = 'http://34.162.165.188:8283/v1/agents/';
const SOURCE_IDS_FILE = path.join(process.cwd(), 'letta-source-ids.txt');
const AGENT_ID_FILE = path.join(process.cwd(), 'letta-agent-id.txt');

interface AgentConfig {
  name: string;
  description: string;
  agent_type: string;
  llm_config: {
    model: string;
    model_endpoint_type: string;
    context_window: number;
    temperature: number;
    max_tokens: number;
  };
  embedding_config: {
    embedding_endpoint_type: string;
    embedding_model: string;
    embedding_dim: number;
  };
}

export async function POST(request: NextRequest) {
  console.log('📋 [LETTA CREATE] Request received to create a new agent');
  try {
    // Get agent configuration from request
    const { name, description } = await request.json();
    
    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      );
    }
    
    // Check for API token

    // Read all source IDs from the file
    let sourceIds: string[] = [];
    try {
      const fileContent = await fs.readFile(SOURCE_IDS_FILE, 'utf-8');
      sourceIds = fileContent.split('\n').filter(id => id.trim());
      
      if (sourceIds.length === 0) {
        return NextResponse.json(
          { error: 'No source IDs found in the file. Please embed some transactions first.' },
          { status: 400 }
        );
      }
      
      console.log(`🔢 [LETTA CREATE] Found ${sourceIds.length} source IDs in file`);
      console.log(`📄 [LETTA CREATE] First few source IDs: ${sourceIds.slice(0, 3).join(', ')}${sourceIds.length > 3 ? '...' : ''}`);
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to read source IDs file. Make sure you have embedded transactions first.' },
        { status: 500 }
      );
    }

    // Just use the source IDs array directly
    const source_ids = sourceIds;

    // Prepare the agent creation payload with the correct field name
    const payload = {
      name,
      agent_type: "memgpt_agent",
      description: description || `Transaction analysis agent created on ${new Date().toISOString()}`,
      source_ids: source_ids, // Use source_ids instead of sources with complex objects
      model: "openai/gpt-4o-mini",
      embedding: "openai/text-embedding-ada-002"
    };

    console.log('📤 [LETTA CREATE] Creating agent with payload:', JSON.stringify(payload, null, 2));

    // Call the Letta API
    const response = await fetch(LETTA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `Failed to create agent. Status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = `${errorMessage}. Details: ${JSON.stringify(errorData)}`;
      } catch (e) {
        // If we can't parse the error as JSON, just use the original error message
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // Parse and return the response
    const data = await response.json();
    
    // Directly write the agent ID to the file
    try {
      await fs.writeFile(AGENT_ID_FILE, data.id);
      console.log(`💾 [LETTA CREATE] Agent ID ${data.id} written to file`);
    } catch (error) {
      console.error('Error writing agent ID to file:', error);
    }
    
    console.log(`✅ [LETTA CREATE] Agent created successfully with ID: ${data.id}`);
    
    return NextResponse.json({
      success: true,
      agent: data,
      sourceCount: sourceIds.length,
      sources: sourceIds
    });
    
  } catch (error) {
    console.error('Error creating Letta agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent', details: (error as Error).message },
      { status: 500 }
    );
  }
} 