import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscriptionNotificationLog extends Document {
    subscriptionId: mongoose.Types.ObjectId;
    scheduledFor: Date;
    sentAt?: Date;
    type: string;
    channel: string;
    status: string;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

const subscriptionNotificationLogSchema = new Schema<ISubscriptionNotificationLog>(
    {
        subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true },
        scheduledFor: { type: Date, required: true },
        sentAt: { type: Date },
        type: { type: String, required: true, trim: true },
        channel: { type: String, required: true, trim: true },
        status: { type: String, default: 'queued', trim: true },
        error: { type: String, trim: true }
    },
    { timestamps: true }
);

subscriptionNotificationLogSchema.index({ subscriptionId: 1, type: 1, scheduledFor: 1 }, { unique: true });

const SubscriptionNotificationLog = mongoose.model<ISubscriptionNotificationLog>('SubscriptionNotificationLog', subscriptionNotificationLogSchema);

export default SubscriptionNotificationLog;
