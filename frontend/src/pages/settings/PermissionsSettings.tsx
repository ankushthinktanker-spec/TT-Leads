import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';
import Button from '../../components/ui/Button';
import { FormLabel, SelectInput } from '../../components/ui/Form';
import WorkspaceSection from '../../components/ui/WorkspaceSection';

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
        <WorkspaceSection
            title="Role permissions"
            description="Define module-level access by role with immediate enforcement across the CRM workspace."
            eyebrow="Access policy"
            aside={(
                <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={loadPermissions} disabled={loading}>
                        Refresh
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={saving || loading || !selectedRole}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            )}
        >

            {message && (
                <div className={`workspace-notice mb-6 ${message.type === 'success' ? 'workspace-notice--success' : 'workspace-notice--danger'}`}>
                    {message.text}
                </div>
            )}

            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end">
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
                <div className="text-xs text-slate-900 font-semibold uppercase tracking-widest">
                    {isCustom ? 'Custom rules' : 'Default rules'}
                </div>
            </div>

            {loading ? (
                <div className="text-slate-500">Loading permissions...</div>
            ) : (
                <div className="overflow-auto rounded-[1.5rem] border border-slate-200 bg-white/72">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50/90 text-xs uppercase text-slate-500">
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
                                <tr key={moduleKey} className="border-t border-slate-200 hover:bg-slate-50">
                                    <td className="py-3 px-4 text-slate-700 font-medium">
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
                                                    className="h-4 w-4 rounded border-slate-300 bg-white text-brand-500 focus:ring-brand-500/30"
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
        </WorkspaceSection>
    );
};

export default PermissionsSettings;


