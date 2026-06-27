import mongoose, { Document, Schema } from 'mongoose';

interface IRole extends Document {
    name: string;
    description?: string;
    isSystem: boolean;
    // P1-4 fix: tenantId scopes custom roles per-tenant; null/undefined = system role
    tenantId?: mongoose.Types.ObjectId;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
    {
        name: {
            type: String,
            required: true,
            trim: true
            // global unique: true removed — replaced with partial indexes below
        },
        description: {
            type: String,
            trim: true
        },
        isSystem: {
            type: Boolean,
            default: false
        },
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            index: true
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

// System roles (tenantId absent): globally unique names
roleSchema.index(
    { name: 1 },
    {
        unique: true,
        partialFilterExpression: { tenantId: { $exists: false } },
        name: 'unique_system_role_name'
    }
);

// Custom roles (tenantId present): unique names per tenant
roleSchema.index(
    { tenantId: 1, name: 1 },
    {
        unique: true,
        partialFilterExpression: { tenantId: { $exists: true } },
        name: 'unique_tenant_role_name'
    }
);

const Role = mongoose.model<IRole>('Role', roleSchema);

export default Role;
