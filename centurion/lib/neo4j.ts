import neo4j, { Driver, Session } from 'neo4j-driver';

// Neo4j connection details
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://34.162.165.188:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

// Create a driver instance
let driver: Driver | null = null;

// Initialize the Neo4j driver
export function initDriver() {
  if (!driver) {
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
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
export async function runQuery(cypher: string, params = {}) {
  const session = getSession();
  try {
    const result = await session.run(cypher, params);
    return result.records.map(record => {
      return record.toObject();
    });
  } catch (error) {
    console.error('Neo4j Query Error:', error);
    throw error;
  } finally {
    session.close();
  }
} 