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

export async function initDatabase() {
  const session = driver.session();
  try {
    const indexes = [
      'CREATE INDEX user_id_idx IF NOT EXISTS FOR (u:User) ON (u.id)',
      'CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE',
      'CREATE INDEX course_id_idx IF NOT EXISTS FOR (c:Course) ON (c.id)',
      'CREATE INDEX course_code_idx IF NOT EXISTS FOR (c:Course) ON (c.courseCode)',
      'CREATE INDEX concept_id_idx IF NOT EXISTS FOR (c:Concept) ON (c.id)',
      'CREATE INDEX concept_course_idx IF NOT EXISTS FOR (c:Concept) ON (c.courseId)',
    ];
    for (const query of indexes) {
      await session.run(query);
    }
    console.log('✓ Database indexes initialized');
  } finally {
    await session.close();
  }
}

export function getSession() {
  return driver.session();
}

export default driver;