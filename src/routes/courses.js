import { Router } from 'express';
import { getSession } from '../db/neo4j.js';

const router = Router();

// GET /api/courses
// List all courses
router.get('/', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (c:Course)
       RETURN c
       ORDER BY c.createdAt DESC`
    );
    const courses = result.records.map(r => r.get('c').properties);
    res.json({ courses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// POST /api/courses
// Create a new course
router.post('/', async (req, res) => {
  const session = getSession();
  try {
    const { title, description = '', educatorId } = req.body;

    if (!title || !educatorId) {
      return res.status(400).json({ error: 'title and educatorId are required' });
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await session.run(
      `CREATE (c:Course {
        id: $id,
        title: $title,
        description: $description,
        educatorId: $educatorId,
        createdAt: $createdAt
      })`,
      { id, title, description, educatorId, createdAt }
    );

    res.status(201).json({ id, title, description, educatorId, createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// GET /api/courses/:id
// Get a single course with its concepts and edges
router.get('/:id', async (req, res) => {
  const session = getSession();
  try {
    const { id } = req.params;

    const courseResult = await session.run(
      'MATCH (c:Course {id: $id}) RETURN c',
      { id }
    );

    if (courseResult.records.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseResult.records[0].get('c').properties;

    const conceptsResult = await session.run(
      'MATCH (c:Concept {courseId: $id}) RETURN c',
      { id }
    );

    const edgesResult = await session.run(
      `MATCH (a:Concept {courseId: $id})-[:REQUIRES]->(b:Concept {courseId: $id})
       RETURN a.id as from, b.id as to`,
      { id }
    );

    const concepts = conceptsResult.records.map(r => r.get('c').properties);
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

// DELETE /api/courses/:id
// Delete a course and all its concepts
router.delete('/:id', async (req, res) => {
  const session = getSession();
  try {
    const { id } = req.params;

    // Delete all concepts in the course first
    await session.run(
      'MATCH (c:Concept {courseId: $id}) DETACH DELETE c',
      { id }
    );

    // Then delete the course itself
    await session.run(
      'MATCH (c:Course {id: $id}) DELETE c',
      { id }
    );

    res.json({ deleted: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

export default router;