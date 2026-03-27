import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createContact, updateContact } from '../../store/slices/contactSlice';
import { fetchCompanies } from '../../store/slices/companySlice';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { TextInput, SelectInput, TextareaInput } from '../ui/Form';
import { showToast } from '../../utils/toast';
import { getErrorMessage } from '../../utils/error';

interface ContactFormModalProps {
    contact?: {
        _id: string;
        firstName?: string;
        lastName?: string;
        designation?: string;
        department?: string;
        email?: string;
        phone?: string;
        alternatePhone?: string;
        whatsapp?: string;
        companyId?: { _id?: string } | string;
        isPrimary?: boolean;
        status?: 'Active' | 'Inactive';
        notes?: string;
    };
    onClose: () => void;
}

const ContactFormModal = ({ contact, onClose }: ContactFormModalProps) => {
    const dispatch = useAppDispatch();
    const { companies } = useAppSelector((state) => state.companies);
    const { loading } = useAppSelector((state) => state.contacts);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        designation: '',
        department: '',
        email: '',
        phone: '',
        alternatePhone: '',
        whatsapp: '',
        companyId: '',
        isPrimary: false,
        status: 'Active' as 'Active' | 'Inactive',
        notes: ''
    });

    useEffect(() => {
        dispatch(fetchCompanies({ limit: 100 }));
    }, [dispatch]);

    useEffect(() => {
        if (contact) {
            setFormData({
                firstName: contact.firstName || '',
                lastName: contact.lastName || '',
                designation: contact.designation || '',
                department: contact.department || '',
                email: contact.email || '',
                phone: contact.phone || '',
                alternatePhone: contact.alternatePhone || '',
                whatsapp: contact.whatsapp || '',
                companyId: (contact.companyId as any)?._id || (contact.companyId as string) || '',
                isPrimary: contact.isPrimary || false,
                status: contact.status || 'Active',
                notes: contact.notes || ''
            });
        }
    }, [contact]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (contact) {
                await dispatch(updateContact({ id: contact._id, data: formData })).unwrap();
                showToast('Contact updated successfully', 'success');
            } else {
                await dispatch(createContact(formData)).unwrap();
                showToast('Contact created successfully', 'success');
            }
            onClose();
        } catch (error) {
            showToast(getErrorMessage(error, 'Failed to save contact'), 'error');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    return (
        <Modal
            title={contact ? 'Edit Contact' : 'Add Contact'}
            onClose={onClose}
            footer={(
                <div className="flex items-center gap-3">
                    <Button type="button" onClick={onClose} variant="outline">
                        Cancel
                    </Button>
                    <Button type="submit" form="contact-form" disabled={loading} variant="primary">
                        {loading ? 'Saving...' : contact ? 'Update Contact' : 'Create Contact'}
                    </Button>
                </div>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-5 py-1" id="contact-form">
                <div className="workspace-notice workspace-notice--muted">
                    <p className="text-sm font-semibold text-slate-900">
                        {contact ? 'Update contact information and communication details.' : 'Create a contact record with role, company, and communication details.'}
                    </p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                        <div className="mb-4 flex items-center gap-3">
                            <span className="h-px flex-1 bg-slate-200" />
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.3em]">Basic information</span>
                            <span className="h-px flex-1 bg-slate-200" />
                        </div>
                        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">First Name</label>
                        <TextInput
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                            placeholder="e.g. Alexander"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Last Name</label>
                        <TextInput
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                            placeholder="e.g. Pierce"
                        />
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Company</label>
                        <SelectInput
                            name="companyId"
                            value={formData.companyId}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select company</option>
                            {companies.map((company) => (
                                <option key={company._id} value={company._id}>{company.name}</option>
                            ))}
                        </SelectInput>
                    </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-4 flex items-center gap-3">
                            <span className="h-px flex-1 bg-slate-200" />
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.3em]">Role information</span>
                            <span className="h-px flex-1 bg-slate-200" />
                        </div>
                        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Designation</label>
                        <TextInput
                            type="text"
                            name="designation"
                            value={formData.designation}
                            onChange={handleChange}
                            placeholder="e.g. Sales Director"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Department</label>
                        <TextInput
                            type="text"
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            placeholder="e.g. Operations"
                        />
                    </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-4 flex items-center gap-3">
                            <span className="h-px flex-1 bg-slate-200" />
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.3em]">Communication details</span>
                            <span className="h-px flex-1 bg-slate-200" />
                        </div>
                        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Primary Email</label>
                        <TextInput
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="protocol@entity.com"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Primary Phone</label>
                        <TextInput
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            placeholder="+1 (555) 000-0000"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">WhatsApp</label>
                        <TextInput
                            type="tel"
                            name="whatsapp"
                            value={formData.whatsapp}
                            onChange={handleChange}
                            placeholder="WhatsApp number"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Status</label>
                        <SelectInput
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </SelectInput>
                    </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-900">Primary contact</p>
                            <p className="text-[11px] font-medium tracking-wide text-indigo-600">Use this when the person is the main point of contact for the company.</p>
                        </div>
                        <input
                            type="checkbox"
                            name="isPrimary"
                            checked={formData.isPrimary}
                            onChange={handleChange}
                            className="h-6 w-6 rounded-lg border-indigo-200 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                        />
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Notes</label>
                        <TextareaInput
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Add relationship context, communication preferences, or notes..."
                            className="min-h-[96px] resize-none"
                        />
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default ContactFormModal;

