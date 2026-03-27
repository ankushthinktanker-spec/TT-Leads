import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoice extends Document {
    tenantId: mongoose.Types.ObjectId;
    invoiceNumber: string;
    companyId: mongoose.Types.ObjectId;
    dealId?: mongoose.Types.ObjectId;
    contractId?: mongoose.Types.ObjectId;
    ownerId?: mongoose.Types.ObjectId;
    status: string;
    issueDate?: Date;
    dueDate?: Date;
    paidDate?: Date;
    amount?: number;
    currency?: string;
    tags?: string[];
    rating?: number;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
    {
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'Tenant ID is strongly required for invoice isolation']
        },
        invoiceNumber: { type: String, required: true, trim: true, unique: true },
        companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
        dealId: { type: Schema.Types.ObjectId, ref: 'Deal' },
        contractId: { type: Schema.Types.ObjectId, ref: 'Contract' },
        ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, default: 'Draft', trim: true },
        issueDate: { type: Date },
        dueDate: { type: Date },
        paidDate: { type: Date },
        amount: { type: Number },
        currency: { type: String, default: 'INR' },
        tags: [{ type: String, trim: true }],
        rating: { type: Number, min: 1, max: 5 },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
    },
    { timestamps: true }
);

invoiceSchema.index({ tenantId: 1, companyId: 1, status: 1 });
invoiceSchema.index({ tenantId: 1, ownerId: 1, createdAt: -1 });

const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);

export default Invoice;
