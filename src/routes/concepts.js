import { Router } from 'express';
import { getSession } from '../db/neo4j.js';
import { requireFields } from '../middleware/validation.js';

const router = Router();

// GET /api/concepts?courseId=demo
router.get('/', async (req, res) => {
  const session = getSession();
  try {
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId query parameter is required' });
    }

    const nodesResult = await session.run(
      'MATCH (c:Concept {courseId: $courseId}) RETURN c',
      { courseId }
    );

    const edgesResult = await session.run(
      `MATCH (a:Concept {courseId: $courseId})-[:REQUIRES]->(b:Concept {courseId: $courseId})
       RETURN a.id as from, b.id as to`,
      { courseId }
    );

    const concepts = nodesResult.records.map(r => r.get('c').properties);
    const edges = edgesResult.records.map(r => ({
      from: r.get('from'),
      to: r.get('to'),
    }));

    res.json({ concepts, edges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// POST /api/concepts
router.post('/', requireFields('title', 'courseId', 'x', 'y'), async (req, res) => {
  const session = getSession();
  try {
    const { title, description = '', courseId, x, y } = req.body;
    const id = crypto.randomUUID();

    await session.run(
      `CREATE (c:Concept {
        id: $id,
        title: $title,
        description: $description,
        courseId: $courseId,
        x: $x,
        y: $y
      })`,
      { id, title, description, courseId, x, y }
    );

    res.status(201).json({ id, title, description, courseId, x, y });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// POST /api/concepts/edge
router.post('/edge', requireFields('fromId', 'toId', 'courseId'), async (req, res) => {
  const session = getSession();
  try {
    const { fromId, toId, courseId } = req.body;

    await session.run(
      `MATCH (a:Concept {id: $fromId, courseId: $courseId})
       MATCH (b:Concept {id: $toId, courseId: $courseId})
       CREATE (b)-[:REQUIRES]->(a)`,
      { fromId, toId, courseId }
    );

    res.status(201).json({ from: fromId, to: toId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// DELETE /api/concepts/:id
router.delete('/:id', async (req, res) => {
  const session = getSession();
  try {
    await session.run(
      'MATCH (c:Concept {id: $id}) DETACH DELETE c',
      { id: req.params.id }
    );
    res.json({ deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

export default router;