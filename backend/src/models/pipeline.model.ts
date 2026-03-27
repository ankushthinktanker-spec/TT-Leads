import mongoose, { Document, Schema } from 'mongoose';

export interface IPipelineStage {
    _id?: mongoose.Types.ObjectId;
    name: string;
    order: number;
}

export interface IPipeline extends Document {
    tenantId: mongoose.Types.ObjectId;
    name: string;
    status: 'Active' | 'Inactive';
    stages: IPipelineStage[];
    access: 'all' | 'selected';
    selectedUserIds: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const pipelineStageSchema = new Schema<IPipelineStage>(
    {
        name: { type: String, required: true, trim: true },
        order: { type: Number, required: true }
    }
);

const pipelineSchema = new Schema<IPipeline>(
    {
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'Tenant ID is strongly required for pipeline isolation']
        },
        name: { type: String, required: true, trim: true },
        status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
        stages: { type: [pipelineStageSchema], default: [] },
        access: { type: String, enum: ['all', 'selected'], default: 'all' },
        selectedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
    },
    { timestamps: true }
);

pipelineSchema.index({ tenantId: 1, name: 1 }, { unique: true });
pipelineSchema.index({ tenantId: 1, status: 1 });

const Pipeline = mongoose.model<IPipeline>('Pipeline', pipelineSchema);

export default Pipeline;
