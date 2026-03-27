import mongoose, { Document, Schema } from 'mongoose';

export interface IDeal extends Document {
    tenantId: mongoose.Types.ObjectId;
    name: string;
    companyId: mongoose.Types.ObjectId;
    ownerId?: mongoose.Types.ObjectId;
    pipelineId?: mongoose.Types.ObjectId;
    stageId?: mongoose.Types.ObjectId;
    status: 'Open' | 'Won' | 'Lost';
    value?: number;
    currency?: string;
    expectedCloseDate?: Date;
    probability?: number;
    rating?: number;
    tags?: string[];
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const dealSchema = new Schema<IDeal>(
    {
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'Tenant ID is strongly required for deal isolation']
        },
        name: { type: String, required: true, trim: true },
        companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
        ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
        pipelineId: { type: Schema.Types.ObjectId, ref: 'Pipeline' },
        stageId: { type: Schema.Types.ObjectId },
        status: { type: String, default: 'Open', enum: ['Open', 'Won', 'Lost'] },
        value: { type: Number },
        currency: { type: String, default: 'INR' },
        expectedCloseDate: { type: Date },
        probability: { type: Number, min: 0, max: 100 },
        rating: { type: Number, min: 1, max: 5 },
        tags: [{ type: String, trim: true }],
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
    },
    { timestamps: true }
);

dealSchema.index({ tenantId: 1, companyId: 1, status: 1 });
dealSchema.index({ tenantId: 1, ownerId: 1, createdAt: -1 });

const Deal = mongoose.model<IDeal>('Deal', dealSchema);

export default Deal;
