import mongoose, { Document, Schema } from 'mongoose';

interface ICompany extends Document {
    // Basic Information
    name: string;
    website?: string;
    industry?: string;
    companySize?: '1-10' | '11-50' | '51-200' | '201-500' | '500+';

    // Contact Information
    address: {
        street?: string;
        city?: string;
        state?: string;
        country: string;
        pinCode?: string;
    };
    phone?: string;
    email?: string;

    // Business Information
    gst?: string;
    pan?: string;
    registrationNumber?: string;

    // Metadata
    tags: string[];
    customFields?: Map<string, unknown>;
    status: 'Active' | 'Inactive';

    // Audit
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
    {
        name: {
            type: String,
            required: [true, 'Company name is required'],
            trim: true,
            index: true
        },
        website: {
            type: String,
            trim: true
        },
        industry: {
            type: String,
            trim: true
        },
        companySize: {
            type: String,
            enum: ['1-10', '11-50', '51-200', '201-500', '500+']
        },

        // Contact Information
        address: {
            street: String,
            city: String,
            state: String,
            country: {
                type: String,
                default: 'India'
            },
            pinCode: String
        },
        phone: {
            type: String,
            trim: true
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
        },

        // Business Information
        gst: {
            type: String,
            trim: true,
            uppercase: true
        },
        pan: {
            type: String,
            trim: true,
            uppercase: true
        },
        registrationNumber: {
            type: String,
            trim: true
        },

        // Metadata
        tags: [{
            type: String,
            trim: true
        }],
        customFields: {
            type: Map,
            of: Schema.Types.Mixed
        },
        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active'
        },

        // Audit
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    {
        timestamps: true
    }
);

// Indexes
companySchema.index({ email: 1 });
companySchema.index({ phone: 1 });
companySchema.index({ gst: 1 });
companySchema.index({ createdAt: -1 });
companySchema.index({ status: 1 });
companySchema.index({ createdBy: 1 });
companySchema.index({ tags: 1 });

const Company = mongoose.model<ICompany>('Company', companySchema);

export default Company;
