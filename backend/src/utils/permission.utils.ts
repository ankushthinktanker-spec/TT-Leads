import RolePermission from '../models/role-permission.model';

export const PERMISSION_MODULES = [
    'leads',
    'companies',
    'contacts',
    'proposals',
    'proposal_templates',
    'tasks',
    'reports',
    'analytics',
    'users',
    'settings',
    'activities'
] as const;

export const PERMISSION_ACTIONS = [
    'view',
    'create',
    'edit',
    'delete',
    'export',
    'assign',
    'status_change'
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
type RolePermissions = Record<PermissionModule, Record<PermissionAction, boolean>>;

const allTrue = (): Record<PermissionAction, boolean> => ({
    view: true,
    create: true,
    edit: true,
    delete: true,
    export: true,
    assign: true,
    status_change: true
});

export const emptyPermissions = (): RolePermissions => {
    const base = {} as RolePermissions;
    PERMISSION_MODULES.forEach((moduleKey) => {
        base[moduleKey] = {
            view: false,
            create: false,
            edit: false,
            delete: false,
            export: false,
            assign: false,
            status_change: false
        };
    });
    return base;
};

const withOverrides = (
    base: Record<PermissionAction, boolean>,
    overrides: Partial<Record<PermissionAction, boolean>>
) => ({ ...base, ...overrides });

export const DEFAULT_ROLE_PERMISSIONS: Record<string, RolePermissions> = {
    Admin: {
        leads: allTrue(),
        companies: allTrue(),
        contacts: allTrue(),
        proposals: allTrue(),
        proposal_templates: allTrue(),
        tasks: allTrue(),
        reports: allTrue(),
        analytics: withOverrides(allTrue(), { create: false, edit: false, delete: false, assign: false, status_change: false }),
        users: allTrue(),
        settings: withOverrides(allTrue(), { create: false, delete: false, assign: false, status_change: false }),
        activities: allTrue()
    },
    Manager: {
        leads: allTrue(),
        companies: allTrue(),
        contacts: allTrue(),
        proposals: allTrue(),
        proposal_templates: allTrue(),
        tasks: allTrue(),
        reports: allTrue(),
        analytics: withOverrides(allTrue(), { create: false, edit: false, delete: false, assign: false, status_change: false }),
        users: withOverrides(allTrue(), { view: false, create: false, edit: false, delete: false, export: false, assign: false, status_change: false }),
        settings: withOverrides(allTrue(), { edit: false, create: false, delete: false, assign: false, status_change: false }),
        activities: allTrue()
    },
    BDM: {
        leads: withOverrides(allTrue(), { delete: false, assign: false }),
        companies: withOverrides(allTrue(), { delete: false }),
        contacts: allTrue(),
        proposals: withOverrides(allTrue(), { delete: false }),
        proposal_templates: withOverrides(allTrue(), { create: false, edit: false, delete: false }),
        tasks: allTrue(),
        reports: allTrue(),
        analytics: withOverrides(allTrue(), { create: false, edit: false, delete: false, assign: false, status_change: false }),
        users: withOverrides(allTrue(), { view: false, create: false, edit: false, delete: false, export: false, assign: false, status_change: false }),
        settings: withOverrides(allTrue(), { edit: false, create: false, delete: false, assign: false, status_change: false }),
        activities: allTrue()
    },
    Marketing: {
        leads: withOverrides(allTrue(), { delete: false, assign: false }),
        companies: withOverrides(allTrue(), { delete: false }),
        contacts: allTrue(),
        proposals: withOverrides(allTrue(), { delete: false }),
        proposal_templates: withOverrides(allTrue(), { create: false, edit: false, delete: false }),
        tasks: allTrue(),
        reports: allTrue(),
        analytics: withOverrides(allTrue(), { create: false, edit: false, delete: false, assign: false, status_change: false }),
        users: withOverrides(allTrue(), { view: false, create: false, edit: false, delete: false, export: false, assign: false, status_change: false }),
        settings: withOverrides(allTrue(), { edit: false, create: false, delete: false, assign: false, status_change: false }),
        activities: allTrue()
    },
    User: {
        leads: withOverrides(allTrue(), { delete: false, assign: false }),
        companies: withOverrides(allTrue(), { delete: false }),
        contacts: allTrue(),
        proposals: withOverrides(allTrue(), { delete: false }),
        proposal_templates: withOverrides(allTrue(), { create: false, edit: false, delete: false }),
        tasks: allTrue(),
        reports: allTrue(),
        analytics: withOverrides(allTrue(), { create: false, edit: false, delete: false, assign: false, status_change: false }),
        users: withOverrides(allTrue(), { view: false, create: false, edit: false, delete: false, export: false, assign: false, status_change: false }),
        settings: withOverrides(allTrue(), { edit: false, create: false, delete: false, assign: false, status_change: false }),
        activities: allTrue()
    }
};

export const mergePermissions = (
    defaults: RolePermissions,
    overrides: Partial<RolePermissions>
): RolePermissions => {
    const merged = { ...defaults } as RolePermissions;
    PERMISSION_MODULES.forEach((moduleKey) => {
        const base = defaults[moduleKey] || allTrue();
        const override = overrides?.[moduleKey] || {};
        merged[moduleKey] = { ...base, ...override };
    });
    return merged;
};

export const sanitizePermissions = (input: unknown): Partial<RolePermissions> => {
    const sanitized: Partial<RolePermissions> = {};

    PERMISSION_MODULES.forEach((moduleKey) => {
        const moduleInput = (input as Record<string, unknown> | undefined)?.[moduleKey];
        if (!moduleInput || typeof moduleInput !== 'object') {
            return;
        }

        const actionMap: Partial<Record<PermissionAction, boolean>> = {};
        PERMISSION_ACTIONS.forEach((actionKey) => {
            const value = (moduleInput as Record<string, unknown>)[actionKey];
            if (typeof value === 'boolean') {
                actionMap[actionKey] = value;
            }
        });

        if (Object.keys(actionMap).length > 0) {
            sanitized[moduleKey] = actionMap as Record<PermissionAction, boolean>;
        }
    });

    return sanitized;
};

export const getEffectivePermissions = async (role: string): Promise<RolePermissions> => {
    const defaults = DEFAULT_ROLE_PERMISSIONS[role] || emptyPermissions();
    const stored = await RolePermission.findOne({ role }).lean();
    const overrides = stored?.permissions || {};
    return mergePermissions(defaults, overrides);
};
