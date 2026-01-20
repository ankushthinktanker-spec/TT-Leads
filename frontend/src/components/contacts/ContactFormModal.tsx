import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createContact, updateContact } from '../../store/slices/contactSlice';
import { fetchCompanies } from '../../store/slices/companySlice';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FormLabel, TextInput, SelectInput, TextareaInput } from '../ui/Form';
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
                companyId: contact.companyId?._id || contact.companyId || '',
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
            title={contact ? 'Edit Contact' : 'Add New Contact'}
            onClose={onClose}
            footer={(
                <>
                    <Button type="button" onClick={onClose} variant="outline">
                        Cancel
                    </Button>
                    <Button type="submit" form="contact-form" disabled={loading} variant="primary">
                        {loading ? 'Saving...' : contact ? 'Update Contact' : 'Create Contact'}
                    </Button>
                </>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-4" id="contact-form">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <FormLabel>
                            First Name <span className="text-red-500">*</span>
                        </FormLabel>
                        <TextInput
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <FormLabel>
                            Last Name <span className="text-red-500">*</span>
                        </FormLabel>
                        <TextInput
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <FormLabel>
                            Company <span className="text-red-500">*</span>
                        </FormLabel>
                        <SelectInput
                            name="companyId"
                            value={formData.companyId}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Company</option>
                            {companies.map((company) => (
                                <option key={company._id} value={company._id}>{company.name}</option>
                            ))}
                        </SelectInput>
                    </div>

                    <div>
                        <FormLabel>Designation</FormLabel>
                        <TextInput
                            type="text"
                            name="designation"
                            value={formData.designation}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <FormLabel>Department</FormLabel>
                        <TextInput
                            type="text"
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <FormLabel>
                            Email <span className="text-red-500">*</span>
                        </FormLabel>
                        <TextInput
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <FormLabel>
                            Phone <span className="text-red-500">*</span>
                        </FormLabel>
                        <TextInput
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <FormLabel>Alternate Phone</FormLabel>
                        <TextInput
                            type="tel"
                            name="alternatePhone"
                            value={formData.alternatePhone}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <FormLabel>WhatsApp</FormLabel>
                        <TextInput
                            type="tel"
                            name="whatsapp"
                            value={formData.whatsapp}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <FormLabel>Status</FormLabel>
                        <SelectInput
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </SelectInput>
                    </div>

                    <div className="md:col-span-2">
                        <label className="flex items-center gap-2 text-secondary-300">
                            <input
                                type="checkbox"
                                name="isPrimary"
                                checked={formData.isPrimary}
                                onChange={handleChange}
                                className="checkbox"
                            />
                            <span className="text-sm font-medium">Primary Contact</span>
                        </label>
                    </div>

                    <div className="md:col-span-2">
                        <FormLabel>Notes</FormLabel>
                        <TextareaInput
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Add context or relationship details..."
                        />
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default ContactFormModal;
