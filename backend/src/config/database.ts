import mongoose from 'mongoose';
import { TEST_MONGODB_URI } from './env';
import { getRuntimeMode, setDatabaseReady } from './runtime';

mongoose.set('bufferCommands', false);

const connectDB = async (): Promise<void> => {
    try {
        const runtimeMode = getRuntimeMode();
        const mongoURI = runtimeMode === 'test' ? TEST_MONGODB_URI || process.env.MONGODB_URI : process.env.MONGODB_URI;

        if (!mongoURI || !String(mongoURI).trim()) {
            throw new Error('MongoDB connection string is not configured');
        }

        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000),
            socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 10000),
            maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 10),
        });

        setDatabaseReady(true);
        console.log('MongoDB connected successfully');
        console.log(`Database: ${runtimeMode}`);
    } catch (error) {
        setDatabaseReady(false);
        console.error('MongoDB connection error:', error);
        throw error;
    }
};

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
    setDatabaseReady(true);
});

mongoose.connection.on('disconnected', () => {
    setDatabaseReady(false);
    console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    setDatabaseReady(false);
    console.error('MongoDB error:', err);
});

export default connectDB;
