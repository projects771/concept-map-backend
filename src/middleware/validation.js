// Checks that required fields exist in req.body
export function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => {
      const value = req.body[f];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(', ')}`,
      });
    }

    next();
  };
}

// Checks that an id param looks valid (non-empty string)
export function requireId(req, res, next) {
  if (!req.params.id || req.params.id.trim() === '') {
    return res.status(400).json({ error: 'Invalid or missing id' });
  }
  next();
}

// Validates mastery status value
export function validateMasteryStatus(req, res, next) {
  const { status } = req.body;
  const valid = ['learning', 'confident', 'struggling'];
  if (!valid.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${valid.join(', ')}`,
    });
  }
  next();
}