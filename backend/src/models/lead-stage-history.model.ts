import mongoose, { Document, Schema } from 'mongoose';

interface ILeadStageHistory extends Document {
    leadId: mongoose.Types.ObjectId;
    fromStatus?: string;
    toStatus: string;
    changedBy: mongoose.Types.ObjectId;
    changedAt: Date;
}

const leadStageHistorySchema = new Schema<ILeadStageHistory>(
    {
        leadId: {
            type: Schema.Types.ObjectId,
            ref: 'Lead',
            required: true,
            index: true
        },
        fromStatus: {
            type: String,
            trim: true
        },
        toStatus: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        changedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        changedAt: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    {
        timestamps: false
    }
);

leadStageHistorySchema.index({ leadId: 1, changedAt: -1 });

const LeadStageHistory = mongoose.model<ILeadStageHistory>('LeadStageHistory', leadStageHistorySchema);

export default LeadStageHistory;
