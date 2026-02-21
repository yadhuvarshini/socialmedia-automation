import { auth } from '../firebase.js';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { verifyToken } from '../services/jwt.js';

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  let firebaseUid = null;
  let mongoUserId = null;

  // 1. Check JWT (Blazly token from login/signup)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    const jwtUserId = verifyToken(token);
    if (jwtUserId) {
      mongoUserId = jwtUserId;
    }
  }

  // 2. Check session.userId (MongoDB-only auth: email signup/login)
  if (!mongoUserId && req.session && req.session.userId) {
    mongoUserId = req.session.userId;
  }

  // 3. Check Authorization Header (Firebase token from frontend)
  if (!mongoUserId && firebaseUid === null && authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      if (!auth) {
        if (config.nodeEnv === 'development') {
          console.warn('Firebase Auth not initialized. Using unverified decode for local dev only.');
          try {
            const parts = token.split('.');
            if (parts.length !== 3) throw new Error('Invalid JWT structure');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            firebaseUid = payload.user_id || payload.sub || payload.uid;
            if (!firebaseUid) throw new Error('Token payload missing UID');
          } catch (_) {}
        }
      } else {
        const decodedToken = await auth.verifyIdToken(token);
        firebaseUid = decodedToken.uid;
      }
    } catch (err) {
      console.error('Auth verification failed:', err.message);
    }
  }

  // 4. Check session.uid (Firebase UID from OAuth redirects)
  if (!mongoUserId && !firebaseUid && req.session && req.session.uid) {
    firebaseUid = req.session.uid;
  }

  try {
    if (mongoUserId) {
      const mongoUser = await User.findById(mongoUserId);
      if (mongoUser) {
        req.user = mongoUser;
        return next();
      }
    }

    if (firebaseUid) {
      let mongoUser = await User.findOne({ firebaseUid });
      if (!mongoUser) {
        mongoUser = await User.create({ firebaseUid });
      }
      req.user = mongoUser;
      req.user.uid = firebaseUid;
      if (req.session && !req.session.uid) {
        req.session.uid = firebaseUid;
      }
      return next();
    }
  } catch (err) {
    console.error('MongoDB User lookup failed:', err);
    return res.status(500).json({ error: 'Authentication internal error' });
  }

  res.status(401).json({ error: 'Not authenticated' });
}
