import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/thinktanker-leads';

async function testConnection() {
    console.log('Testing connection to:', MONGO_URI);
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected successfully!');
        
        const db = mongoose.connection.db;
        if (!db) {
            console.error('Database connection object is undefined');
            process.exit(1);
        }
        
        const users = await db.collection('users').find({}).toArray();
        console.log('Users in database:', users.length);
        users.forEach(u => console.log(` - ${u.email} (${u.role})`));
        
        process.exit(0);
    } catch (error) {
        console.error('Connection failed:', error);
        process.exit(1);
    }
}

testConnection();
