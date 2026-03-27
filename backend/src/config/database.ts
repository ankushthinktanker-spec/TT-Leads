import mongoose from 'mongoose';
import { env } from './env';

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = env.MONGODB_URI;

        await mongoose.connect(mongoURI);

        console.log('MongoDB connected successfully');
        console.log(`Database: ${mongoose.connection.name}`);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
};

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err);
});

export default connectDB;
