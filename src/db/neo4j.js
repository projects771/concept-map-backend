import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

export async function testConnection() {
  try {
    await driver.verifyConnectivity();
    console.log('✓ Neo4j connected');
  } catch (err) {
    console.warn('⚠ Neo4j not connected:', err.message);
  }
}

export function getSession() {
  return driver.session();
}

export default driver;