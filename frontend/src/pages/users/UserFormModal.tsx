import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { createUser, updateUser, User } from '../../store/slices/userSlice';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { FormLabel, TextInput, SelectInput } from '../../components/ui/Form';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    user?: User | null;
    onSuccess: () => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, user, onSuccess }) => {
    const dispatch = useAppDispatch();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        role: 'BDM',
        status: 'Active' as 'Active' | 'Inactive'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [roles, setRoles] = useState<Array<{ _id: string; name: string }>>([]);

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone || '',
                password: '',
                role: user.role,
                status: user.status
            });
        } else {
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                password: '',
                role: 'BDM',
                status: 'Active'
            });
        }
        setError(null);
    }, [user, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const loadRoles = async () => {
            try {
                const response = await api.get('/roles');
                const rolesList = response.data.data.roles || [];
                setRoles(rolesList);
                if (!user && rolesList.length > 0) {
                    setFormData((prev) => ({ ...prev, role: rolesList[0].name }));
                }
            } catch (error) {
                const fallback = [
                    { _id: 'admin', name: 'Admin' },
                    { _id: 'manager', name: 'Manager' },
                    { _id: 'bdm', name: 'BDM' },
                    { _id: 'marketing', name: 'Marketing' },
                    { _id: 'user', name: 'User' }
                ];
                setRoles(fallback);
                if (!user && fallback.length > 0) {
                    setFormData((prev) => ({ ...prev, role: fallback[0].name }));
                }
            }
        };
        loadRoles();
    }, [isOpen, user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (user) {
                const { password: _password, ...updateData } = formData;
                await dispatch(updateUser({ id: user._id, data: updateData })).unwrap();
            } else {
                await dispatch(createUser(formData)).unwrap();
            }
            onSuccess();
            onClose();
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to save user'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            title={user ? 'Edit User' : 'Add New User'}
            onClose={onClose}
            className="max-w-lg"
            footer={(
                <>
                    <Button type="button" onClick={onClose} variant="outline">
                        Cancel
                    </Button>
                    <Button type="submit" form="user-form" disabled={loading} variant="primary">
                        {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
                    </Button>
                </>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-5" id="user-form">
                <div className="workspace-notice workspace-notice--muted">
                    {user
                        ? 'Update user identity, access level, and account status from one compact workspace form.'
                        : 'Create a new team member account with the correct role and active status.'}
                </div>

                {error && (
                    <div className="alert-error">
                        {error}
                    </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="mb-4 flex items-center gap-3">
                        <span className="h-px flex-1 bg-slate-200" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Identity</span>
                        <span className="h-px flex-1 bg-slate-200" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex items-center gap-3">
                        <span className="h-px flex-1 bg-slate-200" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Account</span>
                        <span className="h-px flex-1 bg-slate-200" />
                    </div>
                <div>
                    <FormLabel>Email</FormLabel>
                    <TextInput
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div>
                    <FormLabel>Phone</FormLabel>
                    <TextInput
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                    />
                </div>

                {!user && (
                    <div>
                        <FormLabel>Password</FormLabel>
                        <TextInput
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required={!user}
                            minLength={6}
                        />
                    </div>
                )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex items-center gap-3">
                        <span className="h-px flex-1 bg-slate-200" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Access</span>
                        <span className="h-px flex-1 bg-slate-200" />
                    </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <FormLabel>Role</FormLabel>
                        <SelectInput
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                        >
                            {roles.map((role) => (
                                <option key={role._id} value={role.name}>
                                    {role.name}
                                </option>
                            ))}
                        </SelectInput>
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
                </div>
                </div>
            </form>
        </Modal>
    );
};

export default UserFormModal;
