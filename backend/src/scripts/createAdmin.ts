
import dotenv from 'dotenv';
import User from '../models/user.model';
import connectDB from '../config/database';

dotenv.config();

const createAdmin = async () => {
    try {
        await connectDB();

        const adminEmail = 'admin@example.com';
        const adminPassword = 'Admin@123';

        const userExists = await User.findOne({ email: adminEmail });

        if (userExists) {
            console.log('Admin user already exists');
            console.log(`Email: ${adminEmail}`);
            console.log('Password: (as previously set)');
            process.exit(0);
        }

        const user = await User.create({
            firstName: 'Admin',
            lastName: 'User',
            email: adminEmail,
            password: adminPassword,
            role: 'Admin',
            status: 'Active'
        });

        console.log('Admin user created successfully');
        console.log(`Email: ${user.email}`);
        console.log(`Password: ${adminPassword}`);

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
};

createAdmin();
