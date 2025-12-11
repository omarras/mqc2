import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectMongo() {
    try {
        await mongoose.connect(config.mongoUri, {
            maxPoolSize: 10,
        });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
}
