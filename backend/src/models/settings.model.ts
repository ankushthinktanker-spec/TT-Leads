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
    type: 'Company' | 'System';
    data: ICompanySettings | Record<string, unknown>; // Flexible for other setting types
    updatedBy: mongoose.Types.ObjectId;
    updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
    {
        type: {
            type: String,
            required: true,
            enum: ['Company', 'System'],
            unique: true // Ensure only one document per type
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

const Settings = mongoose.model<ISettings>('Settings', settingsSchema);

export default Settings;
