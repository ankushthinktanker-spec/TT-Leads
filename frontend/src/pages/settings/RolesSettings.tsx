import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { FormLabel, TextInput, SelectInput } from '../../components/ui/Form';
import { Table, TableHead, TableRow, TableHeadCell, TableBody, TableCell } from '../../components/ui/Table';
import { getErrorMessage } from '../../utils/error';

interface RoleItem {
    _id: string;
    name: string;
    description?: string;
    isSystem?: boolean;
}

const RolesSettings = () => {
    const [roles, setRoles] = useState<RoleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        baseRole: ''
    });

    const loadRoles = async () => {
        try {
            setLoading(true);
            const response = await api.get('/roles');
            const data = response.data.data.roles || [];
            setRoles(data);
            setError(null);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to load roles'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRoles();
    }, []);

    const handleOpenModal = () => {
        setFormData({ name: '', description: '', baseRole: '' });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/roles', {
                name: formData.name,
                description: formData.description,
                baseRole: formData.baseRole || undefined
            });
            await loadRoles();
            setIsModalOpen(false);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to create role'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (roleId: string) => {
        if (!window.confirm('Delete this role?')) return;
        try {
            await api.delete(`/roles/${roleId}`);
            await loadRoles();
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to delete role'));
        }
    };

    return (
        <SurfaceCard className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-secondary-50">Roles</h2>
                    <p className="text-sm text-secondary-400">Create custom roles and manage access levels.</p>
                </div>
                <Button variant="primary" onClick={handleOpenModal}>
                    <Plus size={18} />
                    Add Role
                </Button>
            </div>

            {error && (
                <div className="alert-error mb-6">
                    {error}
                </div>
            )}

            <div className="overflow-x-auto">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeadCell>Role</TableHeadCell>
                            <TableHeadCell>Description</TableHeadCell>
                            <TableHeadCell>Type</TableHeadCell>
                            <TableHeadCell className="text-right">Actions</TableHeadCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-secondary-400">
                                    Loading roles...
                                </TableCell>
                            </TableRow>
                        ) : roles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-secondary-400">
                                    No roles found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            roles.map((role) => (
                                <TableRow key={role._id} className="group">
                                    <TableCell className="font-medium text-secondary-100">{role.name}</TableCell>
                                    <TableCell className="text-secondary-400">{role.description || '-'}</TableCell>
                                    <TableCell className="text-secondary-400">
                                        {role.isSystem ? 'System' : 'Custom'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => handleDelete(role._id)}
                                                className="icon-button text-red-400 hover:text-red-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                                disabled={role.isSystem}
                                                title={role.isSystem ? 'System roles cannot be deleted' : 'Delete role'}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {isModalOpen && (
                <Modal
                    title="Create Role"
                    onClose={handleCloseModal}
                    footer={(
                        <>
                            <Button type="button" onClick={handleCloseModal} variant="outline">
                                Cancel
                            </Button>
                            <Button type="submit" form="role-form" variant="primary" disabled={saving}>
                                {saving ? 'Creating...' : 'Create Role'}
                            </Button>
                        </>
                    )}
                >
                    <form id="role-form" onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <FormLabel>Role Name</FormLabel>
                            <TextInput
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <FormLabel>Description</FormLabel>
                            <TextInput
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <FormLabel>Copy Permissions From</FormLabel>
                            <SelectInput name="baseRole" value={formData.baseRole} onChange={handleChange}>
                                <option value="">Start empty</option>
                                {roles.map((role) => (
                                    <option key={role._id} value={role.name}>
                                        {role.name}
                                    </option>
                                ))}
                            </SelectInput>
                        </div>
                    </form>
                </Modal>
            )}
        </SurfaceCard>
    );
};

export default RolesSettings;
