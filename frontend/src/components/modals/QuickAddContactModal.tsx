import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createContact } from '../../store/slices/contactSlice';
import { showToast } from '../../utils/toast';
import { getErrorMessage } from '../../utils/error';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FormLabel, TextInput, SelectInput } from '../ui/Form';

interface QuickAddContactModalProps {
    onClose: () => void;
    onSuccess: (contactId: string) => void;
    preSelectedCompanyId?: string;
}

interface QuickContactResponse {
    data?: {
        contact?: {
            _id: string;
        };
    };
}

const QuickAddContactModal = ({ onClose, onSuccess, preSelectedCompanyId }: QuickAddContactModalProps) => {
    const dispatch = useAppDispatch();
    const { items: companies } = useAppSelector((state) => state.companies);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        companyId: preSelectedCompanyId || '',
        designation: '',
        department: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await dispatch(createContact({
                ...formData,
                status: 'Active',
                isPrimary: false,
            })).unwrap() as QuickContactResponse;

            if (!result.data?.contact?._id) {
                throw new Error('Contact creation response was missing the contact id');
            }

            onSuccess(result.data.contact._id);
            onClose();
        } catch (error) {
            console.error('Failed to create contact:', error);
            showToast(getErrorMessage(error, 'Failed to create contact'), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Quick Add Contact"
            onClose={onClose}
            className="max-w-md"
            footer={(
                <>
                    <Button type="button" onClick={onClose} variant="outline">
                        Cancel
                    </Button>
                    <Button type="submit" form="quick-contact-form" disabled={loading} variant="primary">
                        {loading ? 'Creating...' : 'Create Contact'}
                    </Button>
                </>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-4" id="quick-contact-form">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">Create a contact record quickly and attach it to the selected company.</p>
                    <p className="mt-1 text-xs text-slate-500">Required fields are kept minimal so you can continue the lead workflow without interruption.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                            placeholder="John"
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
                            placeholder="Doe"
                        />
                    </div>
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
                        placeholder="john@example.com"
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
                        placeholder="+91 1234567890"
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
                            <option key={company._id} value={company._id}>
                                {company.name}
                            </option>
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
                        placeholder="Manager"
                    />
                </div>
            </form>
        </Modal>
    );
};

export default QuickAddContactModal;
