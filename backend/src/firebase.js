import admin from 'firebase-admin';
import { config } from './config.js';

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        let credential;

        if (config.firebaseServiceAccount) {
            try {
                const serviceAccount = typeof config.firebaseServiceAccount === 'string'
                    ? JSON.parse(config.firebaseServiceAccount)
                    : config.firebaseServiceAccount;
                credential = admin.credential.cert(serviceAccount);
            } catch (err) {
                console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', err.message);
            }
        }

        // Only initialize if we have a credential or we're in an environment that might have default ones
        // In local dev without config.firebaseServiceAccount, we avoid calling applicationDefault() to prevent crash
        if (credential || config.nodeEnv === 'production') {
            admin.initializeApp({
                credential: credential || admin.credential.applicationDefault(),
                projectId: 'blazly-social-51a89'
            });
            console.log('Firebase Admin initialized');
        } else {
            console.warn('Firebase Admin NOT initialized: No credentials provided.');
        }
    } catch (err) {
        console.error('Firebase Admin init failed:', err.message);
    }
}

export const auth = admin.apps.length ? admin.auth() : null;
export default admin;
