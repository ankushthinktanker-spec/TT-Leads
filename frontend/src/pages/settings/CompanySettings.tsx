import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchCompanySettings, updateCompanySettings, CompanySettings as ICompanySettings } from '../../store/slices/settingsSlice';
import { Building2, Mail, Phone, Globe, MapPin, Save, DollarSign, Percent } from 'lucide-react';
import Button from '../../components/ui/Button';
import { FormLabel, TextInput, SelectInput } from '../../components/ui/Form';
import WorkspaceSection from '../../components/ui/WorkspaceSection';
import { getErrorMessage } from '../../utils/error';

const CompanySettings = () => {
    const dispatch = useAppDispatch();
    const { company, loading } = useAppSelector((state) => state.settings);

    const [formData, setFormData] = useState<ICompanySettings>({
        name: '',
        email: '',
        phone: '',
        website: '',
        address: {
            street: '',
            city: '',
            state: '',
            country: 'India',
            pinCode: ''
        },
        currency: 'INR',
        taxRate: 18,
        logo: ''
    });

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        dispatch(fetchCompanySettings());
    }, [dispatch]);

    useEffect(() => {
        if (company) {
            setFormData(company);
        }
    }, [company]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            if (parent === 'address') {
                setFormData(prev => ({
                    ...prev,
                    address: {
                        ...prev.address,
                        [child]: value
                    }
                }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        try {
            await dispatch(updateCompanySettings(formData)).unwrap();
            setMessage({ type: 'success', text: 'Company settings updated successfully' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error: unknown) {
            setMessage({ type: 'error', text: getErrorMessage(error, 'Failed to update settings') });
        }
    };

    return (
        <div className="space-y-6">
            {message && (
                <div className={`workspace-notice ${message.type === 'success' ? 'workspace-notice--success' : 'workspace-notice--danger'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <WorkspaceSection
                    title="Company information"
                    description="Maintain the core organization profile used across CRM records, proposals, and account ownership views."
                    eyebrow="Organization profile"
                    aside={<><Building2 size={16} className="text-brand-500" /> Shared tenant data</>}
                >
                    <div className="workspace-form-grid">
                        <div className="md:col-span-2">
                            <FormLabel>Company Name</FormLabel>
                            <TextInput
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div>
                            <FormLabel>Email Address</FormLabel>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900" size={20} />
                                <TextInput
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <FormLabel>Phone Number</FormLabel>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900" size={20} />
                                <TextInput
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <FormLabel>Website</FormLabel>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900" size={20} />
                                <TextInput
                                    type="url"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    placeholder="https://"
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>
                </WorkspaceSection>

                <WorkspaceSection
                    title="Address details"
                    description="Use a clean operational address so documents, invoices, and team references stay consistent."
                    eyebrow="Location"
                    aside={<><MapPin size={16} className="text-brand-500" /> Office address</>}
                >
                    <div className="workspace-form-grid">
                        <div className="md:col-span-2">
                            <FormLabel>Street Address</FormLabel>
                            <TextInput
                                type="text"
                                name="address.street"
                                value={formData.address.street}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <FormLabel>City</FormLabel>
                            <TextInput
                                type="text"
                                name="address.city"
                                value={formData.address.city}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <FormLabel>State</FormLabel>
                            <TextInput
                                type="text"
                                name="address.state"
                                value={formData.address.state}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <FormLabel>Country</FormLabel>
                            <TextInput
                                type="text"
                                name="address.country"
                                value={formData.address.country}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <FormLabel>PIN Code</FormLabel>
                            <TextInput
                                type="text"
                                name="address.pinCode"
                                value={formData.address.pinCode}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </WorkspaceSection>

                <WorkspaceSection
                    title="Financial defaults"
                    description="These defaults are applied across proposals, commercial documents, and invoice generation flows."
                    eyebrow="Commercial defaults"
                    aside={<><DollarSign size={16} className="text-brand-500" /> Revenue settings</>}
                >
                    <div className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        These defaults are used across proposals and invoices.
                    </div>
                    <div className="workspace-form-grid">
                        <div>
                            <FormLabel>Default Currency</FormLabel>
                            <SelectInput
                                name="currency"
                                value={formData.currency}
                                onChange={handleChange}
                            >
                                <option value="INR">INR (Rs)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (Euro)</option>
                                <option value="GBP">GBP (Pound)</option>
                            </SelectInput>
                        </div>
                        <div>
                            <FormLabel>Default Tax Rate (%)</FormLabel>
                            <div className="relative">
                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900" size={16} />
                                <TextInput
                                    type="number"
                                    name="taxRate"
                                    value={formData.taxRate}
                                    onChange={handleChange}
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>
                </WorkspaceSection>

                <div className="form-actions">
                    <Button type="submit" disabled={loading} variant="primary">
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default CompanySettings;


