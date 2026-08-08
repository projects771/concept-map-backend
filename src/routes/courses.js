import { Router } from 'express';
import { getSession } from '../db/neo4j.js';
import { authenticate } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

// GET /api/courses
// List courses for the current user
router.get('/', async (req, res) => {
  const session = getSession();
  try {
    let query = '';
    if (req.user.role === 'educator') {
      query = `MATCH (c:Course {educatorId: $userId}) RETURN c ORDER BY c.createdAt DESC`;
    } else {
      query = `MATCH (u:User {id: $userId})-[:ENROLLED_IN]->(c:Course) RETURN c ORDER BY c.createdAt DESC`;
    }
    const result = await session.run(query, { userId: req.user.id });
    const courses = result.records.map(r => r.get('c').properties);
    res.json({ courses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// GET /api/courses/join/:code
router.get('/join/:code', async (req, res) => {
  const session = getSession();
  try {
    const { code } = req.params;
    const result = await session.run(
      `MATCH (c:Course {courseCode: $code})
       OPTIONAL MATCH (e:User {id: c.educatorId})
       RETURN c.id as courseId, c.title as title, e.name as educatorName`,
      { code: code.toUpperCase() }
    );
    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Invalid course code' });
    }
    const r = result.records[0];
    res.json({ courseId: r.get('courseId'), title: r.get('title'), educatorName: r.get('educatorName') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// POST /api/courses/join
router.post('/join', async (req, res) => {
  const session = getSession();
  try {
    const { courseCode } = req.body;
    const studentId = req.user.id;
    
    const courseResult = await session.run('MATCH (c:Course {courseCode: $code}) RETURN c.id as id', { code: courseCode.toUpperCase() });
    if (courseResult.records.length === 0) {
      return res.status(404).json({ error: 'Invalid course code' });
    }
    const courseId = courseResult.records[0].get('id');

    await session.run(
      `MATCH (u:User {id: $studentId})
       MATCH (c:Course {id: $courseId})
       MERGE (u)-[:ENROLLED_IN]->(c)`,
      { studentId, courseId }
    );
    res.json({ success: true, courseId });
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
    const { title, description = '' } = req.body;
    const educatorId = req.user.id;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const courseCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    await session.run(
      `CREATE (c:Course {
        id: $id,
        title: $title,
        description: $description,
        educatorId: $educatorId,
        courseCode: $courseCode,
        createdAt: $createdAt
      })`,
      { id, title, description, educatorId, courseCode, createdAt }
    );

    res.status(201).json({ id, title, description, educatorId, courseCode, createdAt });
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

    await session.run(
      'MATCH (c:Concept {courseId: $id}) DETACH DELETE c',
      { id }
    );

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