import { getDb } from '../db.js';

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

    const db = await getDb();
    const user = await db.collection('users').findOne({ token });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
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
