import { Router } from 'express';
import { getSession } from '../db/neo4j.js';
import { requireFields } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/concepts?courseId=demo
router.get('/', async (req, res) => {
  const session = getSession();
  try {
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId query parameter is required' });
    }

    const courseResult = await session.run(
      'MATCH (c:Course {id: $courseId}) RETURN c',
      { courseId }
    );

    const course = courseResult.records.length > 0
      ? courseResult.records[0].get('c').properties
      : null;

    const nodesResult = await session.run(
      'MATCH (c:Concept {courseId: $courseId}) RETURN c',
      { courseId }
    );

    const edgesResult = await session.run(
      `MATCH (target:Concept {courseId: $courseId})-[:REQUIRES]->(source:Concept {courseId: $courseId})
       RETURN source.id as from, target.id as to`,
      { courseId }
    );

    const concepts = nodesResult.records.map(r => r.get('c').properties);
    const edges = edgesResult.records.map(r => ({
      from: r.get('from'),
      to: r.get('to'),
    }));

    res.json({ course, concepts, edges });
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
       MERGE (b)-[:REQUIRES]->(a)`,
      { fromId, toId, courseId }
    );

    res.status(201).json({ from: fromId, to: toId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// DELETE /api/concepts/edge
router.delete('/edge', requireFields('fromId', 'toId'), async (req, res) => {
  const session = getSession();
  try {
    const { fromId, toId } = req.body;
    await session.run(
      `MATCH (target:Concept {id: $toId})-[r:REQUIRES]->(source:Concept {id: $fromId})
       DELETE r`,
      { fromId, toId }
    );
    res.json({ deleted: true, from: fromId, to: toId });
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

// PATCH /api/concepts/:id
router.patch('/:id', async (req, res) => {
  const session = getSession();
  try {
    const { x, y, title, description } = req.body;
    await session.run(
      `MATCH (c:Concept {id: $id})
       SET c.x = $x, c.y = $y, c.title = $title, c.description = $description`,
      { id: req.params.id, x, y, title, description }
    );
    res.json({ id: req.params.id, x, y, title, description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// PATCH /api/concepts/:id/resources
router.patch('/:id/resources', async (req, res) => {
  const session = getSession();
  try {
    const { resources } = req.body; // [{ title, url }]
    await session.run(
      'MATCH (c:Concept {id: $id}) SET c.resources = $resources',
      { id: req.params.id, resources: JSON.stringify(resources) }
    );
    res.json({ id: req.params.id, resources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

export default router;