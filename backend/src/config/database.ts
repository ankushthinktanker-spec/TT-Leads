import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/thinktanker-leads';

        await mongoose.connect(mongoURI);

        console.log('MongoDB connected successfully');
        console.log(`Database: ${mongoose.connection.name}`);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
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
