import { Router } from 'express';
import { getSession } from '../db/neo4j.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/:courseId', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (c:Concept {courseId: $courseId})
       OPTIONAL MATCH (s:Student)-[m:HAS_MASTERY]->(c)
       RETURN c.id as id, c.title as title,
              sum(CASE WHEN m.status = 'confident' THEN 1 ELSE 0 END) as confident,
              sum(CASE WHEN m.status = 'learning' THEN 1 ELSE 0 END) as learning,
              sum(CASE WHEN m.status = 'struggling' THEN 1 ELSE 0 END) as struggling`,
      { courseId: req.params.courseId }
    );

    const analytics = result.records.map(r => ({
      id: r.get('id'),
      title: r.get('title'),
      confident: r.get('confident').toNumber(),
      learning: r.get('learning').toNumber(),
      struggling: r.get('struggling').toNumber(),
    }));

    res.json({ courseId: req.params.courseId, analytics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

export default router;
