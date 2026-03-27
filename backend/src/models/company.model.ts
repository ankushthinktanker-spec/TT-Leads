import mongoose, { Document, Schema } from 'mongoose';
import { decryptValue, encryptValue } from '../utils/dataProtection.utils';

export interface ICompany extends Document {
    tenantId: mongoose.Types.ObjectId;
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
    gstEncrypted?: string;
    panEncrypted?: string;
    registrationNumberEncrypted?: string;

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
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'Tenant ID is strongly required for company isolation']
        },
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
        gstEncrypted: {
            type: String,
            trim: true
        },
        panEncrypted: {
            type: String,
            trim: true
        },
        registrationNumberEncrypted: {
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
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: (_doc, ret) => {
                delete ret.gstEncrypted;
                delete ret.panEncrypted;
                delete ret.registrationNumberEncrypted;
                return ret;
            }
        },
        toObject: {
            virtuals: true
        }
    }
);

companySchema.virtual('gst')
    .get(function (this: ICompany) {
        try {
            if (this.gstEncrypted) return decryptValue(this.gstEncrypted)?.toUpperCase();
            return undefined;
        } catch {
            return undefined;
        }
    })
    .set(function (this: ICompany, value: string) {
        const normalized = value?.trim()?.toUpperCase();
        this.gstEncrypted = encryptValue(normalized);
    });

companySchema.virtual('pan')
    .get(function (this: ICompany) {
        try {
            if (this.panEncrypted) return decryptValue(this.panEncrypted)?.toUpperCase();
            return undefined;
        } catch {
            return undefined;
        }
    })
    .set(function (this: ICompany, value: string) {
        const normalized = value?.trim()?.toUpperCase();
        this.panEncrypted = encryptValue(normalized);
    });

companySchema.virtual('registrationNumber')
    .get(function (this: ICompany) {
        try {
            if (this.registrationNumberEncrypted) return decryptValue(this.registrationNumberEncrypted);
            return undefined;
        } catch {
            return undefined;
        }
    })
    .set(function (this: ICompany, value: string) {
        const normalized = value?.trim();
        this.registrationNumberEncrypted = encryptValue(normalized);
    });

companySchema.pre('save', function (next) {
    const doc = this as unknown as mongoose.Document;
    const legacyGstRaw = doc.get('gst');
    const legacyPanRaw = doc.get('pan');
    const legacyRegRaw = doc.get('registrationNumber');
    const legacyGst = typeof legacyGstRaw === 'string' ? legacyGstRaw : '';
    const legacyPan = typeof legacyPanRaw === 'string' ? legacyPanRaw : '';
    const legacyReg = typeof legacyRegRaw === 'string' ? legacyRegRaw : '';

    if (!this.gstEncrypted && legacyGst) this.gstEncrypted = encryptValue(legacyGst.trim().toUpperCase());
    if (!this.panEncrypted && legacyPan) this.panEncrypted = encryptValue(legacyPan.trim().toUpperCase());
    if (!this.registrationNumberEncrypted && legacyReg) this.registrationNumberEncrypted = encryptValue(legacyReg.trim());
    next();
});

// Indexes for Multi-Tenancy mapping
companySchema.index({ tenantId: 1, name: 1 });
companySchema.index({ tenantId: 1, email: 1 });
companySchema.index({ tenantId: 1, phone: 1 });
companySchema.index({ tenantId: 1, gstEncrypted: 1 });
companySchema.index({ tenantId: 1, createdAt: -1 });
companySchema.index({ tenantId: 1, status: 1 });
companySchema.index({ tenantId: 1, createdBy: 1 });
companySchema.index({ tenantId: 1, tags: 1 });

const Company = mongoose.model<ICompany>('Company', companySchema);

export default Company;
