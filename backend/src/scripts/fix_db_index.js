import mongoose from 'mongoose';
import { config } from '../config.js';
import { User } from '../models/User.js';

async function fixIndex() {
    console.log('Connecting to DB...', config.mongoUri);
    try {
        await mongoose.connect(config.mongoUri);
        console.log('Connected to DB');

        console.log('Listing indexes...');
        const indexes = await User.collection.indexes();
        console.log(indexes);

        console.log('Attempting to drop linkedinId_1 index...');
        try {
            await User.collection.dropIndex('linkedinId_1');
            console.log('SUCCESS: Dropped linkedinId_1 index. It will be recreated with sparse: true on next server start.');
        } catch (e) {
            console.log('Message:', e.message);
            if (e.code === 27) {
                console.log('Index did not exist, nothing to do.');
            } else {
                console.error('FAILED to drop index:', e);
            }
        }

    } catch (err) {
        console.error('Database connection error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
        process.exit(0);
    }
}

fixIndex();
