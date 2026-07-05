import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const COURSE_ID = 'demo';

const concepts = [
  { id: '1',  title: 'Variables',         x: 300, y: 50  },
  { id: '2',  title: 'Data Types',        x: 100, y: 150 },
  { id: '3',  title: 'Operators',         x: 500, y: 150 },
  { id: '4',  title: 'Conditionals',      x: 100, y: 280 },
  { id: '5',  title: 'Loops',             x: 500, y: 280 },
  { id: '6',  title: 'Functions',         x: 300, y: 400 },
  { id: '7',  title: 'Arrays',            x: 100, y: 510 },
  { id: '8',  title: 'Objects',           x: 500, y: 510 },
  { id: '9',  title: 'Recursion',         x: 300, y: 620 },
  { id: '10', title: 'Higher-Order Fns',  x: 300, y: 740 },
];

const edges = [
  { from: '1', to: '2'  },
  { from: '1', to: '3'  },
  { from: '2', to: '4'  },
  { from: '3', to: '4'  },
  { from: '3', to: '5'  },
  { from: '4', to: '6'  },
  { from: '5', to: '6'  },
  { from: '6', to: '7'  },
  { from: '6', to: '8'  },
  { from: '6', to: '9'  },
  { from: '7', to: '10' },
  { from: '9', to: '10' },
];

async function seed() {
  const session = driver.session();
  try {
    console.log('🌱 Clearing existing demo data...');
    await session.run(
      'MATCH (c:Concept {courseId: $courseId}) DETACH DELETE c',
      { courseId: COURSE_ID }
    );

    console.log('📦 Creating concept nodes...');
    for (const c of concepts) {
      await session.run(
        `CREATE (c:Concept {
          id: $id,
          title: $title,
          courseId: $courseId,
          x: $x,
          y: $y
        })`,
        { ...c, courseId: COURSE_ID }
      );
      console.log(`  ✓ ${c.title}`);
    }

    console.log('🔗 Creating dependency edges...');
    for (const e of edges) {
      await session.run(
        `MATCH (a:Concept {id: $from, courseId: $courseId})
         MATCH (b:Concept {id: $to,   courseId: $courseId})
         CREATE (b)-[:REQUIRES]->(a)`,
        { ...e, courseId: COURSE_ID }
      );
      console.log(`  ✓ ${concepts.find(c => c.id === e.to)?.title} requires ${concepts.find(c => c.id === e.from)?.title}`);
    }

    console.log('\n✅ Seed complete! 10 concepts, 12 dependencies.');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

seed();