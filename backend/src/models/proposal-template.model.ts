import mongoose, { Document, Schema } from 'mongoose';

interface IProposalTemplate extends Document {
    // Basic Information
    name: string;
    description?: string;
    category?: string;

    // Structure - Default sections
    defaultSections: {
        sectionOrder: number;
        sectionTitle: string;
        sectionType: 'RichText' | 'Table' | 'Mixed';
        content: string;
        includeInIndex: boolean;
    }[];

    // Settings
    isActive: boolean;
    isDefault: boolean;

    // Usage Tracking
    usageCount: number;
    lastUsedAt?: Date;

    // Audit
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const proposalTemplateSchema = new Schema<IProposalTemplate>(
    {
        name: {
            type: String,
            required: [true, 'Template name is required'],
            trim: true,
            unique: true
        },
        description: {
            type: String,
            trim: true
        },
        category: {
            type: String,
            trim: true
        },

        // Default sections embedded
        defaultSections: [{
            sectionOrder: {
                type: Number,
                required: true
            },
            sectionTitle: {
                type: String,
                required: true
            },
            sectionType: {
                type: String,
                enum: ['RichText', 'Table', 'Mixed'],
                default: 'RichText'
            },
            content: {
                type: String,
                required: true
            },
            includeInIndex: {
                type: Boolean,
                default: true
            }
        }],

        // Settings
        isActive: {
            type: Boolean,
            default: true
        },
        isDefault: {
            type: Boolean,
            default: false
        },

        // Usage Tracking
        usageCount: {
            type: Number,
            default: 0,
            min: 0
        },
        lastUsedAt: Date,

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
proposalTemplateSchema.index({ isActive: 1, isDefault: -1 });
proposalTemplateSchema.index({ category: 1 });

const ProposalTemplate = mongoose.model<IProposalTemplate>('ProposalTemplate', proposalTemplateSchema);

export default ProposalTemplate;
