import mongoose, { Document, Schema } from 'mongoose';

export interface IProposal extends Document {
    tenantId: mongoose.Types.ObjectId;
    // Identification
    proposalNumber: string;
    title: string;
    version: number;

    // Linking
    leadId?: mongoose.Types.ObjectId;
    companyId: mongoose.Types.ObjectId;
    contactId?: mongoose.Types.ObjectId;

    // Dates
    proposalDate: Date;
    validTill: Date;

    // Financial
    currency: string;
    totalAmount?: number;

    // Status
    status: 'Draft' | 'Sent' | 'Under Review' | 'Accepted' | 'Rejected';

    // Branding & PDF
    logoUrl?: string;
    headerText?: string;
    footerLine1?: string;
    footerLine2?: string;
    showPageNumbers: boolean;
    tocDepth?: number;

    // Prepared By
    preparedBy: {
        name: string;
        designation: string;
        company: string;
        email?: string;
        phone?: string;
        website?: string;
    };

    // Client Details (for cover page)
    clientDetails: {
        companyName: string;
        contactPerson?: string;
        designation?: string;
        email?: string;
        phone?: string;
        address?: string;
    };

    // Approval Workflow
    approvalStatus?: 'Pending' | 'Approved' | 'Rejected';
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;

    // PDF
    generatedPdfPath?: string;
    generatedPdfSize?: number;
    lastGeneratedAt?: Date;

    // Metadata
    notes?: string;

    // Audit
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const proposalSchema = new Schema<IProposal>(
    {
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'Tenant ID is strongly required for proposal isolation']
        },
        proposalNumber: {
            type: String,

            required: true
        },
        title: {
            type: String,
            required: [true, 'Proposal title is required'],
            trim: true
        },
        version: {
            type: Number,
            default: 1,
            min: 1
        },

        // Linking
        leadId: {
            type: Schema.Types.ObjectId,
            ref: 'Lead'
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true
        },
        contactId: {
            type: Schema.Types.ObjectId,
            ref: 'Contact'
        },

        // Dates
        proposalDate: {
            type: Date,
            required: true,
            default: Date.now
        },
        validTill: {
            type: Date,
            required: true
        },

        // Financial
        currency: {
            type: String,
            default: 'INR',
            enum: ['INR', 'USD', 'EUR', 'GBP']
        },
        totalAmount: {
            type: Number,
            min: 0
        },

        // Status
        status: {
            type: String,
            enum: ['Draft', 'Sent', 'Under Review', 'Accepted', 'Rejected'],
            default: 'Draft'
        },

        // Branding & PDF
        logoUrl: String,
        headerText: String,
        footerLine1: String,
        footerLine2: String,
        showPageNumbers: {
            type: Boolean,
            default: true
        },
        tocDepth: {
            type: Number,
            default: 1,
            min: 1,
            max: 3
        },

        // Prepared By
        preparedBy: {
            name: {
                type: String,
                required: true
            },
            designation: String,
            company: {
                type: String,
                required: true
            },
            email: String,
            phone: String,
            website: String
        },

        // Client Details
        clientDetails: {
            companyName: {
                type: String,
                required: true
            },
            contactPerson: String,
            designation: String,
            email: String,
            phone: String,
            address: String
        },

        // Approval Workflow
        approvalStatus: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected']
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        approvedAt: Date,

        // PDF
        generatedPdfPath: String,
        generatedPdfSize: Number,
        lastGeneratedAt: Date,

        // Metadata
        notes: String,

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

// Generate proposal number before saving
proposalSchema.pre('validate', async function (next) {
    if (this.isNew && !this.proposalNumber) {
        const year = new Date().getFullYear();
        // Securely count proposals strictly within the current tenant isolation
        const count = await mongoose.model('Proposal').countDocuments({ tenantId: this.tenantId });
        this.proposalNumber = `PROP-${year}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

proposalSchema.pre('save', async function (next) {
    if (this.isNew) {
        const year = new Date().getFullYear();
        if (!this.proposalNumber) {
            const count = await mongoose.model('Proposal').countDocuments({ tenantId: this.tenantId });
            this.proposalNumber = `PROP-${year}-${String(count + 1).padStart(4, '0')}`;
        }
    }
    next();
});

// Indexes
// Indexes for Multi-Tenancy mapping
proposalSchema.index({ tenantId: 1, proposalNumber: 1 }, { unique: true });
proposalSchema.index({ tenantId: 1, companyId: 1, status: 1 });
proposalSchema.index({ leadId: 1 });
proposalSchema.index({ status: 1, proposalDate: -1 });
proposalSchema.index({ createdBy: 1, createdAt: -1 });

const Proposal = mongoose.model<IProposal>('Proposal', proposalSchema);

export default Proposal;
