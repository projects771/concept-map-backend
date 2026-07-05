import { Router } from 'express';
import { getSession } from '../db/neo4j.js';

const router = Router();

// GET /api/gaps/:conceptId?studentId=student1
router.get('/:conceptId', async (req, res) => {
  const session = getSession();
  try {
    const { conceptId } = req.params;
    const { studentId } = req.query;

    // Get all downstream concepts
    const downstreamResult = await session.run(
      `MATCH p=(downstream:Concept)-[:REQUIRES*1..]->(gap:Concept {id: $conceptId})
       RETURN DISTINCT downstream.id as id,
              downstream.title as title,
              length(p) as distance`,
      { conceptId }
    );

    const downstream = downstreamResult.records.map(r => ({
      id: r.get('id'),
      title: r.get('title'),
      distance: r.get('distance').toNumber(),
    }));

    // If studentId provided, fetch their mastery for these concepts
    let masteryMap = {};
    if (studentId && downstream.length > 0) {
      const ids = downstream.map(d => d.id);
      const masteryResult = await session.run(
        `MATCH (s:Student {id: $studentId})-[m:HAS_MASTERY]->(c:Concept)
         WHERE c.id IN $ids
         RETURN c.id as conceptId, m.status as status`,
        { studentId, ids }
      );
      masteryResult.records.forEach(r => {
        masteryMap[r.get('conceptId')] = r.get('status');
      });
    }

    // Attach risk level to each downstream concept
    const atRisk = downstream.map(d => {
      const status = masteryMap[d.id] || 'unknown';
      const risk = status === 'confident' ? 'safe'
                 : status === 'struggling' ? 'high'
                 : status === 'learning'   ? 'medium'
                 : 'unknown';
      return { ...d, status, risk };
    });

    // Sort: high risk first, then medium, unknown, safe
    const riskOrder = { high: 0, medium: 1, unknown: 2, safe: 3 };
    atRisk.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk]);

    res.json({ gapConceptId: conceptId, studentId: studentId || null, atRisk });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

export default router;