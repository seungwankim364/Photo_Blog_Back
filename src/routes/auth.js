import express from 'express';
import crypto from 'crypto';
import { getDb } from '../db.js';

const router = express.Router();

function makePasswordHash(password, salt) {
  return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

router.post('/signup', async (req, res) => {
  try {
    const { name = '', email = '', password = '' } = req.body;

    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = await getDb();
    const existing = await db.collection('users').findOne({ email: trimmedEmail });

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = makePasswordHash(String(password), salt);
    const token = makeToken();

    const user = {
      name: trimmedName,
      email: trimmedEmail,
      salt,
      passwordHash,
      token,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('users').insertOne(user);

    return res.status(201).json({
      message: 'Signup success',
      token,
      user: {
        _id: result.insertedId,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email = '', password = '' } = req.body;
    const trimmedEmail = String(email).trim().toLowerCase();

    if (!trimmedEmail || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const db = await getDb();
    const user = await db.collection('users').findOne({ email: trimmedEmail });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const expectedHash = makePasswordHash(String(password), user.salt);
    if (expectedHash !== user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = makeToken();
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { token, updatedAt: new Date() } }
    );

    return res.status(200).json({
      message: 'Login success',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
