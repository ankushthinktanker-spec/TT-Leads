import mongoose, { Document, Schema } from 'mongoose';

interface ICompanySettings {
    name: string;
    email: string;
    phone: string;
    website: string;
    address: {
        street: string;
        city: string;
        state: string;
        country: string;
        pinCode: string;
    };
    currency: string;
    taxRate: number;
    logo?: string;
}

interface ISettings extends Document {
    tenantId: mongoose.Types.ObjectId;
    type: 'Company' | 'System';
    data: ICompanySettings | Record<string, unknown>; // Flexible for other setting types
    updatedBy: mongoose.Types.ObjectId;
    updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
    {
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true
        },
        type: {
            type: String,
            required: true,
            enum: ['Company', 'System']
        },
        data: {
            type: Schema.Types.Mixed,
            required: true
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    {
        timestamps: true
    }
);

// One settings document per type per tenant (replaces the old global unique on type)
settingsSchema.index({ tenantId: 1, type: 1 }, { unique: true });

const Settings = mongoose.model<ISettings>('Settings', settingsSchema);

export default Settings;
