import mongoose, { Document, Schema } from 'mongoose';

export interface ISecurityEvent extends Document {
    eventType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId?: mongoose.Types.ObjectId;
    ip?: string;
    userAgent?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

const securityEventSchema = new Schema<ISecurityEvent>(
    {
        eventType: { type: String, required: true, trim: true, index: true },
        severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium',
            index: true
        },
        userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        ip: { type: String, trim: true },
        userAgent: { type: String, trim: true },
        requestId: { type: String, trim: true, index: true },
        metadata: { type: Schema.Types.Mixed }
    },
    {
        timestamps: true
    }
);

securityEventSchema.index({ createdAt: -1 });

const SecurityEvent = mongoose.model<ISecurityEvent>('SecurityEvent', securityEventSchema);

export default SecurityEvent;
