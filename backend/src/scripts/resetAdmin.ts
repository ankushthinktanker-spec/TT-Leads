import dotenv from 'dotenv';
import User from '../models/user.model';
import connectDB from '../config/database';

dotenv.config();

const resetAdmin = async () => {
    try {
        await connectDB();

        const adminEmail = 'admin@example.com';
        const newPassword = 'Admin@123';

        // Find the user
        const user = await User.findOne({ email: adminEmail });

        if (user) {
            // Update password directly (hashing happens in pre-save hook usually, but let's check model)
            // Actually, usually we just assign and save to trigger the hook
            user.password = newPassword;
            await user.save();
            console.log('Admin password updated successfully');
        } else {
            // Create if doesn't exist
            await User.create({
                firstName: 'Admin',
                lastName: 'User',
                email: adminEmail,
                password: newPassword,
                role: 'Admin',
                status: 'Active'
            });
            console.log('Admin user created successfully');
        }

        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${newPassword}`);

        process.exit(0);
    } catch (error) {
        console.error('Error resetting admin user:', error);
        process.exit(1);
    }
};

resetAdmin();
