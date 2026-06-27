import mongoose, { Schema } from 'mongoose';

// Mongoose 8: interface describes own fields only; _id typed as string (not ObjectId)
export interface ILeadCounter {
    _id: string; // key: "tenant:<tenantId>:<year>"
    seq: number;
}

const leadCounterSchema = new Schema<ILeadCounter>(
    {
        _id: { type: String, required: true },
        seq: { type: Number, default: 0 },
    },
    { versionKey: false }
);

const LeadCounter = mongoose.model<ILeadCounter>('LeadCounter', leadCounterSchema);

export default LeadCounter;
