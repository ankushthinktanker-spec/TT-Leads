import mongoose, { Document, Schema } from 'mongoose';

type LeadActivityType =
    | 'NOTE'
    | 'STAGE_CHANGE'
    | 'FOLLOWUP_SCHEDULED'
    | 'FOLLOWUP_COMPLETED';

interface ILeadActivity extends Document {
    leadId: mongoose.Types.ObjectId;
    type: LeadActivityType;
    message: string;
    meta?: Record<string, unknown>;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const leadActivitySchema = new Schema<ILeadActivity>(
    {
        leadId: {
            type: Schema.Types.ObjectId,
            ref: 'Lead',
            required: true,
            index: true
        },
        type: {
            type: String,
            required: true,
            enum: ['NOTE', 'STAGE_CHANGE', 'FOLLOWUP_SCHEDULED', 'FOLLOWUP_COMPLETED']
        },
        message: {
            type: String,
            required: true,
            trim: true
        },
        meta: {
            type: Schema.Types.Mixed
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        }
    },
    {
        timestamps: true
    }
);

leadActivitySchema.index({ leadId: 1, createdAt: -1 });

const LeadActivity = mongoose.model<ILeadActivity>('LeadActivity', leadActivitySchema);

export default LeadActivity;
