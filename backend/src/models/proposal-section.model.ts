import mongoose, { Document, Schema } from 'mongoose';

export interface IProposalSection extends Document {
    // Relationship
    proposalId: mongoose.Types.ObjectId;

    // Structure
    sectionOrder: number;
    sectionTitle: string;
    sectionType: 'RichText' | 'Table' | 'Mixed';
    localId?: string;

    // Content (HTML or JSON for rich text editor)
    content: string;

    // Settings
    includeInIndex: boolean;
    isVisible: boolean;

    // Audit
    createdAt: Date;
    updatedAt: Date;
}

const proposalSectionSchema = new Schema<IProposalSection>(
    {
        proposalId: {
            type: Schema.Types.ObjectId,
            ref: 'Proposal',
            required: true,
            index: true
        },

        sectionOrder: {
            type: Number,
            required: true,
            min: 0
        },

        sectionTitle: {
            type: String,
            required: [true, 'Section title is required'],
            trim: true
        },

        sectionType: {
            type: String,
            enum: ['RichText', 'Table', 'Mixed'],
            default: 'RichText'
        },
        localId: {
            type: String,
            trim: true
        },

        content: {
            type: String,
            required: true
        },

        includeInIndex: {
            type: Boolean,
            default: true
        },

        isVisible: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

// Indexes
proposalSectionSchema.index({ proposalId: 1, sectionOrder: 1 });

const ProposalSection = mongoose.model<IProposalSection>('ProposalSection', proposalSectionSchema);

export default ProposalSection;
