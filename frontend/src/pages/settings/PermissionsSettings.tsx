import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Button from '../../components/ui/Button';
import { FormLabel, SelectInput } from '../../components/ui/Form';

type RolePermissions = Record<string, Record<string, boolean>>;

interface RoleEntry {
    role: string;
    permissions: RolePermissions;
    isCustom: boolean;
}

interface PermissionsResponse {
    roles: RoleEntry[];
    modules: string[];
    actions: string[];
}

const MODULE_LABELS: Record<string, string> = {
    leads: 'Leads',
    companies: 'Companies',
    contacts: 'Contacts',
    proposals: 'Proposals',
    proposal_templates: 'Proposal Templates',
    tasks: 'Tasks',
    reports: 'Reports',
    analytics: 'Analytics',
    users: 'Users',
    settings: 'Settings',
    activities: 'Activities'
};

const ACTION_LABELS: Record<string, string> = {
    view: 'View',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    export: 'Export',
    assign: 'Assign',
    status_change: 'Status'
};

const PermissionsSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [roles, setRoles] = useState<RoleEntry[]>([]);
    const [modules, setModules] = useState<string[]>([]);
    const [actions, setActions] = useState<string[]>([]);
    const [selectedRole, setSelectedRole] = useState('');
    const [editablePermissions, setEditablePermissions] = useState<RolePermissions>({});
    const [isCustom, setIsCustom] = useState(false);

    const orderedActions = useMemo(() => {
        if (actions.length) return actions;
        return ['view', 'create', 'edit', 'delete', 'assign', 'status_change', 'export'];
    }, [actions]);

    const orderedModules = useMemo(() => {
        if (modules.length) return modules;
        return Object.keys(MODULE_LABELS);
    }, [modules]);

    const loadPermissions = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/permissions');
            const data: PermissionsResponse = response.data.data;
            setRoles(data.roles);
            setModules(data.modules);
            setActions(data.actions);

            const defaultRole = data.roles[0]?.role || '';
            const roleToSelect = selectedRole || defaultRole;
            const roleEntry = data.roles.find((item) => item.role === roleToSelect) || data.roles[0];
            if (roleEntry) {
                setSelectedRole(roleEntry.role);
                setEditablePermissions(JSON.parse(JSON.stringify(roleEntry.permissions)));
                setIsCustom(roleEntry.isCustom);
            }
        } catch (error: unknown) {
            setMessage({ type: 'error', text: getErrorMessage(error, 'Failed to load permissions') });
        } finally {
            setLoading(false);
        }
    }, [selectedRole]);

    useEffect(() => {
        loadPermissions();
    }, [loadPermissions]);

    const handleRoleChange = (role: string) => {
        const roleEntry = roles.find((item) => item.role === role);
        if (!roleEntry) return;
        setSelectedRole(roleEntry.role);
        setEditablePermissions(JSON.parse(JSON.stringify(roleEntry.permissions)));
        setIsCustom(roleEntry.isCustom);
    };

    const togglePermission = (moduleKey: string, actionKey: string) => {
        setEditablePermissions((prev) => ({
            ...prev,
            [moduleKey]: {
                ...prev[moduleKey],
                [actionKey]: !prev?.[moduleKey]?.[actionKey]
            }
        }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.put(`/permissions/${selectedRole}`, { permissions: editablePermissions });
            setMessage({ type: 'success', text: 'Permissions updated successfully' });
            setTimeout(() => setMessage(null), 3000);
            await loadPermissions();
        } catch (error: unknown) {
            setMessage({ type: 'error', text: getErrorMessage(error, 'Failed to update permissions') });
        } finally {
            setSaving(false);
        }
    };

    return (
        <SurfaceCard className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-secondary-50">Role Permissions</h2>
                    <p className="text-sm text-secondary-400">
                        Set module access rules for each role. Changes are enforced immediately.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={loadPermissions} disabled={loading}>
                        Refresh
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={saving || loading || !selectedRole}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

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

            <div className="flex flex-col lg:flex-row lg:items-end gap-4 mb-6">
                <div className="w-full lg:max-w-xs">
                    <FormLabel>Role</FormLabel>
                    <SelectInput value={selectedRole} onChange={(e) => handleRoleChange(e.target.value)}>
                        {roles.map((role) => (
                            <option key={role.role} value={role.role}>
                                {role.role}
                            </option>
                        ))}
                    </SelectInput>
                </div>
                <div className="text-xs text-secondary-500 font-semibold uppercase tracking-widest">
                    {isCustom ? 'Custom rules' : 'Default rules'}
                </div>
            </div>

            {loading ? (
                <div className="text-secondary-400">Loading permissions...</div>
            ) : (
                <div className="overflow-auto border border-white/5 rounded-2xl">
                    <table className="min-w-full text-sm">
                        <thead className="bg-white/5 text-secondary-400 uppercase text-xs">
                            <tr>
                                <th className="text-left py-3 px-4">Module</th>
                                {orderedActions.map((action) => (
                                    <th key={action} className="text-center py-3 px-3">
                                        {ACTION_LABELS[action] || action}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {orderedModules.map((moduleKey) => (
                                <tr key={moduleKey} className="border-t border-white/5 hover:bg-secondary-900/40">
                                    <td className="py-3 px-4 text-secondary-200 font-medium">
                                        {MODULE_LABELS[moduleKey] || moduleKey}
                                    </td>
                                    {orderedActions.map((actionKey) => {
                                        const checked = !!editablePermissions?.[moduleKey]?.[actionKey];
                                        return (
                                            <td key={actionKey} className="py-2 px-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => togglePermission(moduleKey, actionKey)}
                                                    className="h-4 w-4 rounded border-secondary-700 bg-secondary-900 text-brand-500 focus:ring-brand-500/30"
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </SurfaceCard>
    );
};

export default PermissionsSettings;
