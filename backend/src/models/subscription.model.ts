import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
    tenantId: mongoose.Types.ObjectId;
    name: string;
    vendorName?: string;
    type: string;
    companyId?: mongoose.Types.ObjectId;
    internalOwnerId: mongoose.Types.ObjectId;
    planName?: string;
    billingCycle?: string;
    amount?: number;
    currency?: string;
    startDate?: Date;
    renewDate: Date;
    status: string;
    notes?: string;
    notifyBeforeDays?: number[];
    notificationChannels?: string[];
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
    {
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'Tenant ID is strongly required for subscription isolation']
        },
        name: { type: String, required: true, trim: true },
        vendorName: { type: String, trim: true },
        type: { type: String, default: 'Other', trim: true },
        companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
        internalOwnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        planName: { type: String, trim: true },
        billingCycle: { type: String, trim: true },
        amount: { type: Number },
        currency: { type: String, default: 'INR' },
        startDate: { type: Date },
        renewDate: { type: Date, required: true },
        status: { type: String, default: 'Active', trim: true },
        notes: { type: String, trim: true },
        notifyBeforeDays: { type: [Number], default: [7, 1] },
        notificationChannels: { type: [String], default: ['InApp'] },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
    },
    { timestamps: true }
);

subscriptionSchema.index({ tenantId: 1, renewDate: 1, status: 1 });
subscriptionSchema.index({ tenantId: 1, internalOwnerId: 1, status: 1 });

const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);

export default Subscription;
