import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
    tenantId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    title: string;
    message: string;
    type: string;
    status: string;
    metadata?: Record<string, unknown>;
    readAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'Tenant ID is required for notification containment']
        },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        title: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
        type: { type: String, default: 'INFO', trim: true },
        status: { type: String, default: 'unread', trim: true },
        metadata: { type: Schema.Types.Mixed },
        readAt: { type: Date }
    },
    { timestamps: true }
);

notificationSchema.index({ tenantId: 1, userId: 1, status: 1, createdAt: -1 });

const Notification = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
