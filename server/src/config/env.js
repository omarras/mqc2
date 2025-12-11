export const config = {
    mongoUri: process.env.MONGO_URI,
    env: process.env.NODE_ENV || 'development',
};

export const FAST_CONCURRENCY = parseInt(process.env.FAST_CONCURRENCY || "15", 10);
export const SLOW_CONCURRENCY = parseInt(process.env.SLOW_CONCURRENCY || "2", 10);