import mongoose, { Document, Schema } from 'mongoose';

interface IContact extends Document {
    // Personal Information
    firstName: string;
    lastName: string;
    designation?: string;
    department?: string;

    // Contact Information
    email: string;
    phone: string;
    alternatePhone?: string;
    whatsapp?: string;

    // Relationship
    companyId: mongoose.Types.ObjectId;

    // Metadata
    isPrimary: boolean;
    status: 'Active' | 'Inactive';
    notes?: string;

    // Audit
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
    {
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true
        },
        designation: {
            type: String,
            trim: true
        },
        department: {
            type: String,
            trim: true
        },

        // Contact Information
        email: {
            type: String,
            required: [true, 'Email is required'],
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
        },
        phone: {
            type: String,
            required: [true, 'Phone is required'],
            trim: true
        },
        alternatePhone: {
            type: String,
            trim: true
        },
        whatsapp: {
            type: String,
            trim: true
        },

        // Relationship
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true
        },

        // Metadata
        isPrimary: {
            type: Boolean,
            default: false
        },
        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active'
        },
        notes: {
            type: String,
            trim: true
        },

        // Audit
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    {
        timestamps: true
    }
);

// Indexes
contactSchema.index({ email: 1 });
contactSchema.index({ phone: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ createdBy: 1 });
contactSchema.index({ companyId: 1, isPrimary: -1 });
contactSchema.index({ firstName: 1, lastName: 1 });

// Virtual for full name
contactSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

const Contact = mongoose.model<IContact>('Contact', contactSchema);

export default Contact;
