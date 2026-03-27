import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { FormLabel, TextInput, SelectInput } from '../../components/ui/Form';
import { Table, TableHead, TableRow, TableHeadCell, TableBody, TableCell } from '../../components/ui/Table';
import { getErrorMessage } from '../../utils/error';
import InlineError from '../../components/ui/InlineError';
import RowActions from '../../components/crm/RowActions';
import WorkspaceSection from '../../components/ui/WorkspaceSection';

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
        <WorkspaceSection
            title="Roles"
            description="Create and manage role definitions that structure access, responsibilities, and permission inheritance."
            eyebrow="Role catalog"
            aside={(
                <Button variant="primary" onClick={handleOpenModal}>
                    <Plus size={18} />
                    Add Role
                </Button>
            )}
        >

            {error && (
                <InlineError message={error} onRetry={loadRoles} className="mb-6" />
            )}

            <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white/72">
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
                                <TableCell colSpan={4} className="text-center text-slate-500">
                                    Loading roles...
                                </TableCell>
                            </TableRow>
                        ) : roles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-slate-500">
                                    No roles found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            roles.map((role) => (
                                <TableRow key={role._id} className="group">
                                    <TableCell className="font-medium text-slate-900">{role.name}</TableCell>
                                    <TableCell className="text-slate-500">{role.description || '-'}</TableCell>
                                    <TableCell className="text-slate-500">
                                        {role.isSystem ? 'System' : 'Custom'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <RowActions>
                                            <button
                                                onClick={() => handleDelete(role._id)}
                                                className="icon-button text-red-400 hover:text-red-300"
                                                disabled={role.isSystem}
                                                title={role.isSystem ? 'System roles cannot be deleted' : 'Delete role'}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </RowActions>
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
        </WorkspaceSection>
    );
};

export default RolesSettings;
