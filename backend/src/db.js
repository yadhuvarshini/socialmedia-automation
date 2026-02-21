import mongoose from 'mongoose';
import { config } from './config.js';

export async function connectDb() {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    console.error('Check MONGODB_ATLAS_TROUBLESHOOTING.md if using Atlas.');
    throw err;
  }
}
