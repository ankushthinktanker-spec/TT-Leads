import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity extends Document {
    tenantId: mongoose.Types.ObjectId;
    // Activity Type
    activityType: 'Call' | 'Meeting' | 'Email' | 'WhatsApp' | 'Note';

    // Related To (polymorphic)
    relatedTo: {
        model: 'Lead' | 'Company' | 'Proposal';
        id: mongoose.Types.ObjectId;
    };

    // Content
    subject: string;
    description?: string;
    contactPerson?: string;
    outcome?: string;

    // Scheduling
    activityDate: Date;
    duration?: number; // in minutes
    nextFollowUpDate?: Date;

    // Participants
    createdBy: mongoose.Types.ObjectId;
    attendees?: mongoose.Types.ObjectId[];

    // Attachments
    attachments?: {
        fileName: string;
        filePath: string;
        fileSize: number;
    }[];

    // Audit
    createdAt: Date;
    updatedAt: Date;
}

const activitySchema = new Schema<IActivity>(
    {
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'Tenant ID is strongly required to identify activity containment']
        },
        activityType: {
            type: String,
            required: true,
            enum: ['Call', 'Meeting', 'Email', 'WhatsApp', 'Note']
        },

        // Polymorphic relationship
        relatedTo: {
            model: {
                type: String,
                required: true,
                enum: ['Lead', 'Company', 'Proposal']
            },
            id: {
                type: Schema.Types.ObjectId,
                required: true,
                refPath: 'relatedTo.model'
            }
        },

        // Content
        subject: {
            type: String,
            required: [true, 'Subject is required'],
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        contactPerson: {
            type: String,
            trim: true
        },
        outcome: {
            type: String,
            trim: true
        },

        // Scheduling
        activityDate: {
            type: Date,
            required: true,
            default: Date.now
        },
        duration: {
            type: Number,
            min: 0
        },
        nextFollowUpDate: {
            type: Date
        },

        // Participants
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        attendees: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],

        // Attachments
        attachments: [{
            fileName: String,
            filePath: String,
            fileSize: Number
        }]
    },
    {
        timestamps: true
    }
);

// Indexes for Multi-Tenancy mapping
activitySchema.index({ tenantId: 1, 'relatedTo.model': 1, 'relatedTo.id': 1 });
// PERF-4: Supports $lookup in hotNoMeeting query — converts O(n×m) scan to O(log n)
activitySchema.index({ 'relatedTo.id': 1, activityType: 1, tenantId: 1 });
activitySchema.index({ tenantId: 1, activityDate: -1 });
activitySchema.index({ tenantId: 1, nextFollowUpDate: 1 });
activitySchema.index({ tenantId: 1, createdBy: 1, activityDate: -1 });
activitySchema.index({ tenantId: 1, activityType: 1 });

const Activity = mongoose.model<IActivity>('Activity', activitySchema);

export default Activity;
