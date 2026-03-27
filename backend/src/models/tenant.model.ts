import mongoose, { Document, Schema } from 'mongoose';

export interface ITenant extends Document {
    name: string;
    subdomain?: string;
    domain?: string;
    isActive: boolean;
    subscriptionPlan: 'Free' | 'Pro' | 'Enterprise';
    subscriptionStatus: 'Active' | 'Trial' | 'Cancelled' | 'PastDue';
    trialEndsAt?: Date;
    maxUsers: number;
    settings: {
        currency: string;
        timezone: string;
        dateFormat: string;
        logoUrl?: string;
        primaryColor?: string;
    };
    contactEmail: string;
    contactPhone?: string;
    createdAt: Date;
    updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
    {
        name: {
            type: String,
            required: [true, 'Tenant name is required'],
            trim: true
        },
        subdomain: {
            type: String,
            lowercase: true,
            trim: true,
            unique: true,
            sparse: true
        },
        domain: {
            type: String,
            lowercase: true,
            trim: true,
            unique: true,
            sparse: true
        },
        isActive: {
            type: Boolean,
            default: true
        },
        subscriptionPlan: {
            type: String,
            enum: ['Free', 'Pro', 'Enterprise'],
            default: 'Free'
        },
        subscriptionStatus: {
            type: String,
            enum: ['Active', 'Trial', 'Cancelled', 'PastDue'],
            default: 'Trial'
        },
        trialEndsAt: {
            type: Date
        },
        maxUsers: {
            type: Number,
            default: 3
        },
        settings: {
            currency: { type: String, default: 'USD' },
            timezone: { type: String, default: 'UTC' },
            dateFormat: { type: String, default: 'MM/DD/YYYY' },
            logoUrl: String,
            primaryColor: { type: String, default: '#7c3aed' }
        },
        contactEmail: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },
        contactPhone: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

// Indexes
tenantSchema.index({ subdomain: 1 });
tenantSchema.index({ domain: 1 });
tenantSchema.index({ isActive: 1 });

const Tenant = mongoose.model<ITenant>('Tenant', tenantSchema);

export default Tenant;
