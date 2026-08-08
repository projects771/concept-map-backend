import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getSession } from '../db/neo4j.js';
import { authenticate } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'waypoint_super_secret_jwt_key_2026';

router.post('/register', async (req, res) => {
  const session = getSession();
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const checkResult = await session.run('MATCH (u:User {email: $email}) RETURN u', { email });
    if (checkResult.records.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();

    const result = await session.run(
      `CREATE (u:User {
        id: $id,
        name: $name,
        email: $email,
        password: $password,
        role: $role,
        createdAt: timestamp()
      }) RETURN u`,
      { id, name, email, password: hashedPassword, role }
    );

    const user = result.records[0].get('u').properties;
    delete user.password;

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

router.post('/login', async (req, res) => {
  const session = getSession();
  try {
    const { email, password } = req.body;
    
    const result = await session.run('MATCH (u:User {email: $email}) RETURN u', { email });
    if (result.records.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.records[0].get('u').properties;
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    delete user.password;
    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

router.get('/me', authenticate, async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run('MATCH (u:User {id: $id}) RETURN u', { id: req.user.id });
    if (result.records.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.records[0].get('u').properties;
    delete user.password;
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

router.post('/google', async (req, res) => {
  // Scaffolded for Google OAuth
  // const { googleToken } = req.body;
  // TODO: Verify googleToken with google-auth-library using Client ID
  res.status(501).json({ error: 'Google OAuth not yet implemented' });
});

export default router;
