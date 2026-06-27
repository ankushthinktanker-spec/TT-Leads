import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Tenant from '../models/tenant.model';
import User from '../models/user.model';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI;
const adminEmail = process.env.ADMIN_EMAIL || 'admin@thinktanker.in';
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
const tenantName = process.env.ADMIN_TENANT_NAME || 'ThinkTanker Workspace';

const run = async () => {
    if (!mongoUri) {
        throw new Error('MONGODB_URI is required');
    }

    await mongoose.connect(mongoUri);

    let tenant = await Tenant.findOne({ contactEmail: adminEmail });
    if (!tenant) {
        tenant = await Tenant.create({
            name: tenantName,
            contactEmail: adminEmail,
        });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const user = await User.findOneAndUpdate(
        { email: adminEmail, tenantId: tenant._id },
        {
            $set: {
                email: adminEmail,
                password: passwordHash,
                firstName: 'Workspace',
                lastName: 'Admin',
                role: 'Admin',
                status: 'Active',
                tenantId: tenant._id,
                loginAttempts: 0,
                lockUntil: undefined,
                mfaEnabled: false,
            },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    console.log(`Admin user reset successfully: ${user.email}`);
    console.log(`Password: ${adminPassword}`);

    await mongoose.disconnect();
};

void run().catch(async (error) => {
    console.error('Failed to reset admin user:', error);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
});
