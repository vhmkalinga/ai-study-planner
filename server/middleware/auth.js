import jwt from 'jsonwebtoken';
import db from '../db.js';

const userExists = db.prepare('SELECT 1 FROM users WHERE id = ?');

export default function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  try {
    const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    // A valid token for a deleted account must not keep working.
    if (!userExists.get(decoded.id)) {
      return res.status(401).json({ error: 'Account no longer exists' });
    }
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
