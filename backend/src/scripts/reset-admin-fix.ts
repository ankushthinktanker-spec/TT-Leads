import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/thinktanker-leads';

async function resetAdmin() {
    console.log('Connecting to:', MONGO_URI);
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected successfully!');
        
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB undefined');

        const hashedPassword = await bcrypt.hash('Admin@12345', 10);
        
        // Update or Create admin@example.com
        await db.collection('users').updateOne(
            { email: 'admin@example.com' },
            { 
                $set: { 
                    firstName: 'Admin',
                    lastName: 'User',
                    password: hashedPassword,
                    role: 'Admin',
                    status: 'Active',
                    updatedAt: new Date()
                } 
            },
            { upsert: true }
        );

        console.log('Admin user reset successfully!');
        console.log('Email: admin@example.com');
        console.log('Password: Admin@12345');
        console.log('Role: Admin');
        
        process.exit(0);
    } catch (error) {
        console.error('Reset failed:', error);
        process.exit(1);
    }
}

resetAdmin();
