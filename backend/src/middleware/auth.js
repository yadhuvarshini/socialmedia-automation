import { auth } from '../firebase.js';
import { User } from '../models/User.js';

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  let firebaseUid = null;

  // 1. Check Authorization Header (Standard API calls)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      if (!auth) {
        // Fallback for local development if service account credentials are missing
        console.warn('Firebase Auth Admin not initialized. Using insecure decoding for local development.');
        try {
          // Decode JWT without verification (Insecure - Local Dev Only)
          const parts = token.split('.');
          if (parts.length !== 3) throw new Error('Invalid JWT structure');
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          firebaseUid = payload.user_id || payload.sub || payload.uid;

          if (!firebaseUid) {
            throw new Error('Token payload missing UID');
          }
        } catch (decodeErr) {
          console.error('Insecure token decoding failed:', decodeErr.message);
          throw new Error('Firebase Auth not initialized and token decoding failed');
        }
      } else {
        const decodedToken = await auth.verifyIdToken(token);
        firebaseUid = decodedToken.uid;
      }
    } catch (err) {
      console.error('Auth verification failed:', err.message);
      // Don't fail immediately, try session next
    }
  }

  // 2. Check Session (OAuth Redirects/Browser calls)
  if (!firebaseUid && req.session && req.session.uid) {
    firebaseUid = req.session.uid;
  }

  if (firebaseUid) {
    try {
      // Find or create user in MongoDB
      let mongoUser = await User.findOne({ firebaseUid });
      if (!mongoUser) {
        // This might happen if session sync hasn't run yet
        mongoUser = await User.create({ firebaseUid });
      }

      req.user = mongoUser;
      req.user.uid = firebaseUid; // Keep uid for compatibility

      // Keep session in sync
      if (req.session && !req.session.uid) {
        req.session.uid = firebaseUid;
      }
      return next();
    } catch (err) {
      console.error('MongoDB User lookup failed:', err);
      return res.status(500).json({ error: 'Authentication internal error' });
    }
  }

  // 3. Fail if neither is present
  res.status(401).json({ error: 'Not authenticated' });
}
