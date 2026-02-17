import 'dotenv/config';
import { getDb } from '../db.js';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = header.slice(7).trim();
    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!payload || !payload.userId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(payload.userId) });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      _id: user._id,
      email: user.email,
      name: user.name,
    };

    return next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Auth check failed' });
  }
}
