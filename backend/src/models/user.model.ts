import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';


export interface IUser extends Document {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    avatar?: string;
    role: string;
    tenantId: mongoose.Types.ObjectId; // Critical for multi-tenancy
    status: 'Active' | 'Inactive' | 'Suspended';
    teamId?: mongoose.Types.ObjectId;
    managerId?: mongoose.Types.ObjectId;
    leadsAssigned: number;
    leadsConverted: number;
    conversionRate: number;
    totalRevenue: number;
    emailNotifications: boolean;
    smsNotifications: boolean;
    timezone: string;
    lastLogin?: Date;
    refreshTokenHash?: string;
    refreshTokenExpiresAt?: Date;
    refreshTokenJti?: string;
    refreshTokenClientHash?: string;
    loginAttempts: number;
    lockUntil?: Date;
    mfaEnabled: boolean;
    mfaMethod?: 'totp' | 'sms' | 'email';
    mfaSecretEncrypted?: string;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    getFullName(): string;
}

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [10, 'Password must be at least 10 characters'],
            select: false
        },
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true
        },
        phone: {
            type: String,
            trim: true
        },
        avatar: {
            type: String
        },
        role: {
            type: String,
            default: 'User',
            trim: true
        },
        status: {
            type: String,
            enum: ['Active', 'Inactive', 'Suspended'],
            default: 'Active'
        },
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'Tenant ID is strongly required to identify user containment']
        },
        teamId: {
            type: Schema.Types.ObjectId,
            ref: 'Team'
        },
        managerId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        leadsAssigned: {
            type: Number,
            default: 0
        },
        leadsConverted: {
            type: Number,
            default: 0
        },
        conversionRate: {
            type: Number,
            default: 0
        },
        totalRevenue: {
            type: Number,
            default: 0
        },
        emailNotifications: {
            type: Boolean,
            default: true
        },
        smsNotifications: {
            type: Boolean,
            default: false
        },
        timezone: {
            type: String,
            default: 'UTC'
        },
        lastLogin: {
            type: Date
        },
        refreshTokenHash: {
            type: String
        },
        refreshTokenExpiresAt: {
            type: Date
        },
        refreshTokenJti: {
            type: String
        },
        refreshTokenClientHash: {
            type: String
        },
        loginAttempts: {
            type: Number,
            default: 0
        },
        lockUntil: {
            type: Date
        },
        mfaEnabled: {
            type: Boolean,
            default: false
        },
        mfaMethod: {
            type: String,
            enum: ['totp', 'sms', 'email']
        },
        mfaSecretEncrypted: {
            type: String,
            select: false
        }
    },
    {
        timestamps: true
    }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(env.BCRYPT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Indexes for Multi-Tenancy
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, status: 1 });

// Method to compare password
userSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get full name
userSchema.methods.getFullName = function (): string {
    return `${this.firstName} ${this.lastName}`;
};

// Update conversion rate before saving
userSchema.pre('save', function (next) {
    if (this.leadsAssigned > 0) {
        this.conversionRate = (this.leadsConverted / this.leadsAssigned) * 100;
    }
    next();
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;
