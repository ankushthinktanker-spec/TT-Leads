import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
    tenantId: mongoose.Types.ObjectId;
    // Task Information
    title: string;
    description?: string;
    taskType: 'Follow-up' | 'Reminder' | 'General';

    // Linking (polymorphic)
    relatedTo?: {
        model: 'Lead' | 'Proposal' | 'Activity';
        id: mongoose.Types.ObjectId;
    };

    // Scheduling
    dueDate: Date;
    reminderDate?: Date;
    priority: 'High' | 'Medium' | 'Low';

    // Assignment
    assignedTo: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;

    // Status
    status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
    completedAt?: Date;

    // Audit
    createdAt: Date;
    updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
    {
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'Tenant ID is strongly required to identify task containment']
        },
        title: {
            type: String,
            required: [true, 'Task title is required'],
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        taskType: {
            type: String,
            required: true,
            enum: ['Follow-up', 'Reminder', 'General'],
            default: 'General'
        },

        // Polymorphic relationship (optional)
        relatedTo: {
            model: {
                type: String,
                enum: ['Lead', 'Proposal', 'Activity', 'Company']
            },
            id: {
                type: Schema.Types.ObjectId,
                refPath: 'relatedTo.model'
            }
        },

        // Scheduling
        dueDate: {
            type: Date,
            required: true
        },
        reminderDate: {
            type: Date
        },
        priority: {
            type: String,
            enum: ['High', 'Medium', 'Low'],
            default: 'Medium'
        },

        // Assignment
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        // Status
        status: {
            type: String,
            enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
            default: 'Pending'
        },
        completedAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

// Indexes for Multi-Tenancy mapping
taskSchema.index({ tenantId: 1, assignedTo: 1, status: 1, dueDate: 1 });
taskSchema.index({ tenantId: 1, dueDate: 1 });
taskSchema.index({ tenantId: 1, reminderDate: 1 });
taskSchema.index({ tenantId: 1, 'relatedTo.model': 1, 'relatedTo.id': 1 });
taskSchema.index({ tenantId: 1, status: 1, priority: -1 });

// Auto-update completedAt when status changes to Completed
taskSchema.pre('save', function (next) {
    if (this.isModified('status') && this.status === 'Completed' && !this.completedAt) {
        this.completedAt = new Date();
    }
    next();
});

const Task = mongoose.model<ITask>('Task', taskSchema);

export default Task;
