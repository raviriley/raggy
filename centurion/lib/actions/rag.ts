"use server";

import { Pool } from "pg";

// Define the result row type
interface DocumentRow {
  id: number;
  title: string;
  content: string;
  similarity: number;
}

// Database connection configuration - directly using port-based connection
const pool = new Pool({
  // Use a direct connection string based on environment
  connectionString:
    process.env.NODE_ENV === "production"
      ? "postgresql://raggy_user:changeme@localhost:5432/raggy" // In container
      : "postgresql://raggy_user:changeme@localhost:5432/raggy", // Local development
  // Explicitly set to use password authentication and disable SSL
  ssl: false,
});

// Function to generate embeddings using an embedding model
async function generateEmbedding(text: string): Promise<number[]> {
  // This is a placeholder - you'll need to implement actual embedding generation
  // using an embedding model like OpenAI's text-embedding-ada-002

  // For testing, return a random embedding of dimension 1536
  return Array.from({ length: 1536 }, () => Math.random());
}

// Format the embedding array as a proper pgvector string
function formatEmbeddingForPgvector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

const info = `
URL
Information
https://docs.flare.network
Flare Network is a Layer 1 EVM smart contract platform designed to expand blockchain utility through decentralized data access. The documentation serves three primary audiences: token holders (user guides), developers (developer hub resources), and general users (product explanations and technical concepts). Core components include native oracles (FTSO for time-series data and Flare Data Connector for verifiable queries), FAssets system for cross-chain compatibility, and multiple networks (Mainnet, Songbird canary network, Coston testnets).
https://docs.flare.network/tech/flare
Flare's architecture enables trustless data access through infrastructure providers serving dual roles as validators and data providers. The protocol stack includes FTSO for real-time price feeds (updated every 3 minutes), Flare Data Connector for historical/static data verification, and FAssets bridging non-smart contract tokens. Four networks exist: Mainnet (FLR), Songbird (SGB) for live testing, Coston/Coston2 as developer testnets.
https://docs.flare.network/tech/governance
Governance operates through FIPs (Flare Improvement Proposals) and STPs (Songbird Test Proposals) with weighted voting using wrapped tokens (WFLR/WSGB). FIPs require 66% approval threshold for activation, while STPs default to acceptance unless 33% opposition. Governance powers include protocol upgrades, parameter adjustments, and network policy changes through on-chain voting mechanisms.
https://docs.flare.network/products
Core products include: 1) FTSO Oracle - decentralized price feed system with 100+ data providers 2) Flare Data Connector - cross-chain data verification using state proof technology 3) FAssets - Bitcoin/XRP interoperability protocol (under development) 4) API Portal - unified access to blockchain data and oracle feeds 5) Validator Nodes - 100+ node operators securing network consensus.
https://docs.flare.network/user/wallets
Supported wallets include Bifrost, MetaMask, Ledger, and Trezor with standardized RPC configurations: Chain ID 14 (Flare Mainnet) and 19 (Songbird). All EVM-compatible wallets require manual network setup with specific parameters: RPC endpoints (flare-api.flare.network), block explorers (flare-explorer), and 18 decimal precision for FLR/SGB tokens. Wallet connectivity emphasizes address verification for security.
https://docs.flare.network/user/wallets/brave-wallet
Brave Wallet integration requires browser v1.42.88+ with manual network additions for Flare/Songbird. Configuration parameters include: Mainnet (ChainID 0xe/14), Songbird (0x13/19), custom RPC URLs, and explorer links. Token management features native FLR/SGB support with 18 decimal places.
https://docs.flare.network/tech
Technical concepts include: 1) State Connector - cryptographic verification of external data 2) Flare Systems Protocol - consensus mechanism combining PoS and FTSO 3) Personal Delegation Accounts - non-custodial staking management 4) FlareDrops - 36-month token distribution model 5) EVM extensions - custom precompiles for oracle integration.
https://docs.flare.network/infra
Infrastructure guides detail node operation requirements: Minimum 4-core CPU, 16GB RAM, 1TB SSD storage. Deployment options include AWS/Azure cloud templates and bare-metal setups. Reward mechanisms combine staking yields (8-10% APY) and FTSO participation rewards.
https://docs.flare.network/developer-hub
Developer resources focus on Oracle integration patterns, FAssets smart contract templates, and cross-chain state proofs. SDKs include JavaScript/TypeScript libraries for FTSO data consumption, delegation management APIs, and gas estimation tools optimized for data-intensive dApps.
`;

export async function findRelevantContent(question: string) {
  console.log("question", question);

  try {
    // 1. Generate embedding for the question
    const questionEmbedding = await generateEmbedding(question);
    const questionEmbeddingString =
      formatEmbeddingForPgvector(questionEmbedding);

    // 2. Perform cosine similarity search on the vector database (postgres)
    const query = `
      SELECT d.id, d.title, d.content, 
             1 - (e.embedding <=> $1) as similarity
      FROM documents d
      JOIN embeddings e ON d.id = e.document_id
      ORDER BY similarity DESC
      LIMIT 3;
    `;

    const result = await pool.query<DocumentRow>(query, [
      questionEmbeddingString,
    ]);

    // 3. Format the results into a string
    const formattedResults = result.rows
      .map((row: DocumentRow) => {
        return `${row.title}\n${row.content}\nRelevance: ${(row.similarity * 100).toFixed(2)}%\n`;
      })
      .join("\n");

    // 4. Return the formatted string
    return formattedResults || "No relevant content found.";
  } catch (error) {
    console.error("Error searching for relevant content:", error);
    return "Error retrieving relevant content. Please try again.";
  }
}
