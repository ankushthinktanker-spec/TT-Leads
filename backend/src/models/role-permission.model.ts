import mongoose, { Document, Schema } from 'mongoose';

interface IRolePermissions extends Document {
    tenantId: mongoose.Types.ObjectId;
    role: string;
    permissions: Record<string, Record<string, boolean>>;
    updatedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const rolePermissionSchema = new Schema<IRolePermissions>(
    {
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true
        },
        role: {
            type: String,
            required: true,
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

// One permission document per role per tenant (replaces the old global unique on role)
rolePermissionSchema.index({ tenantId: 1, role: 1 }, { unique: true });

const RolePermission = mongoose.model<IRolePermissions>('RolePermission', rolePermissionSchema);

export default RolePermission;
