import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
    tenantId: mongoose.Types.ObjectId;
    actorId?: mongoose.Types.ObjectId;
    action: string;
    entityType: string;
    entityId?: string;
    ip?: string;
    requestId?: string;
    changes?: Record<string, unknown>;
    previousHash: string;
    hash: string;
    createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
    {
        tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
        actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        action: { type: String, required: true, trim: true, index: true },
        entityType: { type: String, required: true, trim: true, index: true },
        entityId: { type: String, trim: true, index: true },
        ip: { type: String, trim: true },
        requestId: { type: String, trim: true, index: true },
        changes: { type: Schema.Types.Mixed },
        previousHash: { type: String, required: true },
        hash: { type: String, required: true, unique: true }
    },
    {
        timestamps: true
    }
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export default AuditLog;
