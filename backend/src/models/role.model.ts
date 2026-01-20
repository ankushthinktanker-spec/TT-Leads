import mongoose, { Document, Schema } from 'mongoose';

interface IRole extends Document {
    name: string;
    description?: string;
    isSystem: boolean;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        isSystem: {
            type: Boolean,
            default: false
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    {
        timestamps: true
    }
);

const Role = mongoose.model<IRole>('Role', roleSchema);

export default Role;
