import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity extends Document {
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

// Indexes
activitySchema.index({ 'relatedTo.model': 1, 'relatedTo.id': 1 });
activitySchema.index({ activityDate: -1 });
activitySchema.index({ nextFollowUpDate: 1 });
activitySchema.index({ createdBy: 1, activityDate: -1 });
activitySchema.index({ activityType: 1 });

const Activity = mongoose.model<IActivity>('Activity', activitySchema);

export default Activity;
