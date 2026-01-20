import { useState } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { createCompany } from '../../store/slices/companySlice';
import { showToast } from '../../utils/toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FormLabel, TextInput, SelectInput } from '../ui/Form';

interface QuickAddCompanyModalProps {
    onClose: () => void;
    onSuccess: (companyId: string, companyName: string) => void;
}

interface QuickCompanyPayload {
    name: string;
    address: { country: string };
    status: 'Active' | 'Inactive';
    tags: string[];
    industry?: string;
    email?: string;
    phone?: string;
    website?: string;
}

const QuickAddCompanyModal = ({ onClose, onSuccess }: QuickAddCompanyModalProps) => {
    const dispatch = useAppDispatch();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        industry: '',
        email: '',
        phone: '',
        website: '',
        country: 'India',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const trimmed = {
                name: formData.name.trim(),
                industry: formData.industry.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                website: formData.website.trim(),
                country: formData.country.trim()
            };
            const payload: QuickCompanyPayload = {
                name: trimmed.name,
                address: { country: trimmed.country || 'India' },
                status: 'Active',
                tags: []
            };
            if (trimmed.industry) payload.industry = trimmed.industry;
            if (trimmed.email) payload.email = trimmed.email;
            if (trimmed.phone) payload.phone = trimmed.phone;
            if (trimmed.website) payload.website = trimmed.website;

            const result = await dispatch(createCompany(payload)).unwrap();

            onSuccess(result.data.company._id, formData.name);
            onClose();
        } catch (error) {
            console.error('Failed to create company:', error);
            showToast('Failed to create company. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Quick Add Company"
            onClose={onClose}
            className="max-w-md"
            footer={(
                <>
                    <Button type="button" onClick={onClose} variant="outline">
                        Cancel
                    </Button>
                    <Button type="submit" form="quick-company-form" disabled={loading} variant="primary">
                        {loading ? 'Creating...' : 'Create Company'}
                    </Button>
                </>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-4" id="quick-company-form">
                <div>
                    <FormLabel>
                        Company Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <TextInput
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Acme Corp"
                    />
                </div>

                <div>
                    <FormLabel>Industry</FormLabel>
                    <SelectInput
                        name="industry"
                        value={formData.industry}
                        onChange={handleChange}
                    >
                        <option value="">Select Industry</option>
                        <option value="Technology">Technology</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Finance">Finance</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Retail">Retail</option>
                        <option value="Other">Other</option>
                    </SelectInput>
                </div>

                <div>
                    <FormLabel>Email</FormLabel>
                    <TextInput
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="contact@acme.com"
                    />
                </div>

                <div>
                    <FormLabel>Phone</FormLabel>
                    <TextInput
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 1234567890"
                    />
                </div>
            </form>
        </Modal>
    );
};

export default QuickAddCompanyModal;
