import mongoose, { Document, Schema } from 'mongoose';

export interface IContract extends Document {
    tenantId: mongoose.Types.ObjectId;
    contractNumber: string;
    title?: string;
    companyId: mongoose.Types.ObjectId;
    dealId?: mongoose.Types.ObjectId;
    ownerId?: mongoose.Types.ObjectId;
    status: string;
    startDate?: Date;
    endDate?: Date;
    value?: number;
    currency?: string;
    attachmentUrls?: string[];
    tags?: string[];
    rating?: number;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const contractSchema = new Schema<IContract>(
    {
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'Tenant ID is strongly required for contract isolation']
        },
        contractNumber: { type: String, required: true, trim: true },
        title: { type: String, trim: true },
        companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
        dealId: { type: Schema.Types.ObjectId, ref: 'Deal' },
        ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, default: 'Draft', trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        value: { type: Number },
        currency: { type: String, default: 'INR' },
        attachmentUrls: [{ type: String, trim: true }],
        tags: [{ type: String, trim: true }],
        rating: { type: Number, min: 1, max: 5 },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
    },
    { timestamps: true }
);

contractSchema.index({ tenantId: 1, contractNumber: 1 }, { unique: true });
contractSchema.index({ tenantId: 1, companyId: 1, status: 1 });
contractSchema.index({ tenantId: 1, ownerId: 1, createdAt: -1 });

const Contract = mongoose.model<IContract>('Contract', contractSchema);

export default Contract;
