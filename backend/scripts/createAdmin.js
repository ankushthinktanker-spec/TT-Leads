const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/thinktanker-leads';

// Connect to MongoDB
mongoose.connect(mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// User Schema (simplified)
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    firstName: String,
    lastName: String,
    role: String,
    status: String,
    leadsAssigned: { type: Number, default: 0 },
    leadsConverted: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    timezone: { type: String, default: 'UTC' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log('Admin user already exists');
            console.log('Email:', existingAdmin.email);
            console.log('Password: (as previously set)');
            process.exit(0);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Create admin user
        const admin = await User.create({
            email: adminEmail,
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'User',
            role: 'Admin',
            status: 'Active'
        });

        console.log('Admin user created successfully');
        console.log(`Email: ${admin.email}`);
        console.log(`Password: ${adminPassword}`);

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
}

createAdminUser();
