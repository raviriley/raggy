import neo4j, { Driver, Session } from "neo4j-driver";
import { recordAttestation } from "./attestation";

// Neo4j connection details
const NEO4J_URI = process.env.NEO4J_URI || "bolt://34.162.165.188:7687";
const NEO4J_USER = process.env.NEO4J_USER || "neo4j";
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || "password";

// Create a driver instance
let driver: Driver | null = null;

// Initialize the Neo4j driver
export function initDriver() {
  if (!driver) {
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
    );
  }
  return driver;
}

// Get a session for running queries
export function getSession(): Session {
  const driver = initDriver();
  return driver.session();
}

// Close the driver when the application shuts down
export function closeDriver() {
  if (driver) {
    driver.close();
    driver = null;
  }
}

// Helper function to run a Cypher query
export async function runQuery(cypher: string, params = {}, options: { 
  skipAttestation?: boolean;
  actionType?: string;
} = {}) {
  const session = getSession();
  let startTime = Date.now();
  
  try {
    const result = await session.run(cypher, params);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const records = result.records.map((record) => {
      return record.toObject();
    });
    
    // Record attestation if not explicitly skipped
    if (!options.skipAttestation) {
      await recordAttestation({
        toolName: "GraphDB",
        actionType: options.actionType || "query",
        query: cypher,
        // Convert result to string but limit size for storage
        result: JSON.stringify(records).substring(0, 1000) + 
                (JSON.stringify(records).length > 1000 ? "..." : ""),
        metadata: {
          paramCount: Object.keys(params).length,
          recordCount: records.length,
          durationMs: duration
        }
      });
    }
    
    return records;
  } catch (error) {
    console.error("Neo4j Query Error:", error);
    
    // Record error attestation
    if (!options.skipAttestation) {
      await recordAttestation({
        toolName: "GraphDB",
        actionType: "query_error",
        query: cypher,
        result: (error as Error).message,
        metadata: {
          errorType: (error as Error).name,
          params: JSON.stringify(params).substring(0, 500)
        }
      });
    }
    
    throw error;
  } finally {
    session.close();
  }
}
