import { Router } from 'express';
import { getSession } from '../db/neo4j.js';
import { requireFields, validateMasteryStatus } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// PATCH /api/mastery/:conceptId
router.patch('/:conceptId', requireFields('status'), validateMasteryStatus, async (req, res) => {
  const session = getSession();
  try {
    const { conceptId } = req.params;
    const { status } = req.body;
    const studentId = req.user.id;

    await session.run(
      `MERGE (s:Student {id: $studentId})
       MERGE (c:Concept {id: $conceptId})
       MERGE (s)-[m:HAS_MASTERY]->(c)
       SET m.status = $status, m.updatedAt = datetime()`,
      { studentId, conceptId, status }
    );

    res.json({ studentId, conceptId, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// GET /api/mastery
router.get('/', async (req, res) => {
  const session = getSession();
  try {
    const studentId = req.user.id;

    const result = await session.run(
      `MATCH (s:Student {id: $studentId})-[m:HAS_MASTERY]->(c:Concept)
       RETURN c.id as conceptId, m.status as status`,
      { studentId }
    );

    const mastery = result.records.map(r => ({
      conceptId: r.get('conceptId'),
      status: r.get('status'),
    }));

    res.json({ studentId, mastery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

export default router;