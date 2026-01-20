import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { updateProfile } from '../../store/slices/authSlice';
import { User, Mail, Phone, Save } from 'lucide-react';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Button from '../../components/ui/Button';
import { FormLabel, TextInput } from '../../components/ui/Form';
import { getErrorMessage } from '../../utils/error';

const ProfileSettings = () => {
    const dispatch = useAppDispatch();
    const { user, loading } = useAppSelector((state) => state.auth);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
    });
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone || ''
            });
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        try {
            await dispatch(updateProfile(formData)).unwrap();
            setMessage({ type: 'success', text: 'Profile updated successfully' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error: unknown) {
            setMessage({ type: 'error', text: getErrorMessage(error, 'Failed to update profile') });
        }
    };

    return (
        <SurfaceCard className="p-6 w-full">
            <h2 className="text-xl font-semibold text-secondary-50 mb-6 flex items-center gap-2">
                <User size={22} className="text-brand-400" />
                Profile Information
            </h2>

            {message && (
                <div
                    className={`rounded-xl border px-4 py-3 text-sm mb-6 ${
                        message.type === 'success'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-red-500/30 bg-red-500/10 text-red-300'
                    }`}
                >
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <FormLabel>First Name</FormLabel>
                        <TextInput
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div>
                        <FormLabel>Last Name</FormLabel>
                        <TextInput
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <div>
                    <FormLabel>Email Address</FormLabel>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500" size={20} />
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
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500" size={20} />
                        <TextInput
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="pl-10"
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <Button type="submit" disabled={loading} variant="primary">
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </SurfaceCard>
    );
};

export default ProfileSettings;
