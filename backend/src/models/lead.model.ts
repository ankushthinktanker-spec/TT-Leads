import mongoose, { Document, Schema } from 'mongoose';
import LeadCounter from './lead-counter.model';

export interface ILead extends Document {
    tenantId: mongoose.Types.ObjectId;
    leadNumber: string;

    // Contact Information
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    alternatePhone?: string;
    company: string; // Kept for backward compatibility
    designation?: string;
    website?: string;

    // New: Company & Contact Relationships
    companyId?: mongoose.Types.ObjectId;
    contactId?: mongoose.Types.ObjectId;
    requirementSummary?: string;

    // Lead Details
    source: string;
    sourceDetails?: string;
    status: string;
    lifecycleStage: string;
    priority: 'Hot' | 'Warm' | 'Cold';

    // Business Information
    industry?: string;
    companySize?: string;
    location: {
        city?: string;
        state?: string;
        country: string;
    };

    // Opportunity Details
    serviceInterest: string[];
    budget?: {
        min: number;
        max: number;
        currency: string;
    };
    dealValue?: number;
    expectedCloseDate?: Date;

    // Assignment & Ownership
    ownerId?: mongoose.Types.ObjectId;
    assignedTo?: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
    teamId?: mongoose.Types.ObjectId;

    // Tracking
    lastContactedDate?: Date;
    nextFollowUpDate?: Date;
    followUpType?: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING';
    followUpCount: number;
    lastStageChangedAt?: Date;

    // Engagement Score
    engagementScore?: number;

    // Analytics
    probability?: number;
    firstResponseAt?: Date;
    lastActivityAt?: Date;
    leadQualityScore?: number;
    duplicateGroupId?: string;

    // Metadata
    tags: string[];
    customFields?: Map<string, unknown>;

    // Audit
    createdAt: Date;
    updatedAt: Date;
    convertedAt?: Date;
    closedAt?: Date;
    lostReason?: string;
}

const leadSchema = new Schema<ILead>(
    {
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'Tenant ID is strongly required to identify lead containment']
        },
        leadNumber: {
            type: String,
            required: true
            // Removed global unique: true, enforced via compound index instead
        },

        // Contact Information
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
        email: {
            type: String,
            required: [true, 'Email is required'],
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
        },
        phone: {
            type: String,
            required: [true, 'Phone is required'],
            trim: true
        },
        alternatePhone: {
            type: String,
            trim: true
        },
        company: {
            type: String,
            required: [true, 'Company name is required'],
            trim: true
        },
        designation: {
            type: String,
            trim: true
        },
        website: {
            type: String,
            trim: true
        },

        // New: Company & Contact Relationships
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            index: true
        },
        contactId: {
            type: Schema.Types.ObjectId,
            ref: 'Contact'
        },
        requirementSummary: {
            type: String,
            trim: true
        },

        // Lead Details
        source: {
            type: String,
            required: [true, 'Lead source is required'],
            enum: ['Website', 'Referral', 'Cold Call', 'LinkedIn', 'Email Campaign', 'Trade Show', 'Partner', 'JustDial', 'Other']
        },
        sourceDetails: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            required: true,
            enum: ['New', 'Contacted', 'Qualified', 'Needs Analysis', 'Proposal Sent', 'Negotiation', 'Won', 'Lost', 'Nurture'],
            default: 'New'
        },
        lifecycleStage: {
            type: String,
            required: true,
            enum: ['New', 'Contacted', 'Qualified', 'Opportunity', 'Customer'],
            default: 'New'
        },
        priority: {
            type: String,
            enum: ['Hot', 'Warm', 'Cold'],
            default: 'Warm'
        },

        // Business Information
        industry: {
            type: String,
            trim: true
        },
        companySize: {
            type: String,
            enum: ['1-10', '11-50', '51-200', '201-500', '500+']
        },
        location: {
            city: String,
            state: String,
            country: {
                type: String,
                required: true,
                default: 'India'
            }
        },

        // Opportunity Details
        serviceInterest: [{
            type: String,
            enum: ['Web Development', 'Mobile App', 'Cloud Services', 'AI/ML', 'DevOps', 'Consulting', 'Other']
        }],
        budget: {
            min: Number,
            max: Number,
            currency: {
                type: String,
                default: 'USD'
            }
        },
        dealValue: {
            type: Number,
            min: 0
        },
        expectedCloseDate: {
            type: Date
        },

        // Assignment & Ownership
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        teamId: {
            type: Schema.Types.ObjectId,
            ref: 'Team'
        },

        // Tracking
        lastContactedDate: {
            type: Date
        },
        nextFollowUpDate: {
            type: Date
        },
        followUpType: {
            type: String,
            enum: ['CALL', 'WHATSAPP', 'EMAIL', 'MEETING']
        },
        followUpCount: {
            type: Number,
            default: 0
        },
        lastStageChangedAt: {
            type: Date
        },

        // Engagement Score
        engagementScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },

        // Analytics
        probability: {
            type: Number,
            min: 0,
            max: 100
        },
        firstResponseAt: {
            type: Date
        },
        lastActivityAt: {
            type: Date,
            index: true
        },
        leadQualityScore: {
            type: Number,
            min: 0,
            max: 100
        },
        duplicateGroupId: {
            type: String,
            trim: true,
            index: true
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

        // Audit
        convertedAt: {
            type: Date
        },
        closedAt: {
            type: Date
        },
        lostReason: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

// Atomically generate a unique lead number per tenant per year using $inc on a counter document.
// This eliminates the countDocuments race condition completely.
leadSchema.pre('validate', async function (next) {
    if (this.isNew && !this.leadNumber) {
        const year = new Date().getFullYear();
        const counterId = `tenant:${this.tenantId}:${year}`;
        const counter = await LeadCounter.findOneAndUpdate(
            { _id: counterId },
            { $inc: { seq: 1 } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        this.leadNumber = `LD-${year}-${String(counter!.seq).padStart(4, '0')}`;
        if (!this.lastStageChangedAt) {
            this.lastStageChangedAt = new Date();
        }
    }
    next();
});

// Indexes for performance & Multi-Tenancy
// Enforce unique leadNumber and email PER tenant
leadSchema.index({ tenantId: 1, leadNumber: 1 }, { unique: true });
leadSchema.index({ tenantId: 1, email: 1 });

// Common tenant-scoped query indexes
leadSchema.index({ tenantId: 1, status: 1 });
leadSchema.index({ tenantId: 1, createdAt: -1 });
leadSchema.index({ tenantId: 1, assignedTo: 1, status: 1 });
leadSchema.index({ tenantId: 1, ownerId: 1 });
leadSchema.index({ tenantId: 1, nextFollowUpDate: 1 });
leadSchema.index({ tenantId: 1, source: 1 });
leadSchema.index({ tenantId: 1, company: 1 });
leadSchema.index({ tenantId: 1, tags: 1 });
leadSchema.index({ tenantId: 1, priority: 1 });
leadSchema.index({ tenantId: 1, status: 1, lastStageChangedAt: 1, ownerId: 1 });


const Lead = mongoose.model<ILead>('Lead', leadSchema);

export default Lead;
