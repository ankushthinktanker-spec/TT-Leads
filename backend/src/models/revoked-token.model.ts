import mongoose, { Document, Schema } from 'mongoose';

export interface IRevokedToken extends Document {
    jti: string;
    userId: mongoose.Types.ObjectId;
    expiresAt: Date;
    reason: string;
    createdAt: Date;
}

const revokedTokenSchema = new Schema<IRevokedToken>(
    {
        jti: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        expiresAt: {
            type: Date,
            required: true
        },
        reason: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: { createdAt: true, updatedAt: false }
    }
);

revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RevokedToken = mongoose.model<IRevokedToken>('RevokedToken', revokedTokenSchema);

export default RevokedToken;
