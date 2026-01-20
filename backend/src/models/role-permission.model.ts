import mongoose, { Document, Schema } from 'mongoose';

interface IRolePermissions extends Document {
    role: string;
    permissions: Record<string, Record<string, boolean>>;
    updatedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const rolePermissionSchema = new Schema<IRolePermissions>(
    {
        role: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        permissions: {
            type: Schema.Types.Mixed,
            required: true
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    {
        timestamps: true
    }
);

const RolePermission = mongoose.model<IRolePermissions>('RolePermission', rolePermissionSchema);

export default RolePermission;
