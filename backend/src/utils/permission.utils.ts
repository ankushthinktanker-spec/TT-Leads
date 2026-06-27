import RolePermission from '../models/role-permission.model';
import { canUseOfflineMode } from '../config/runtime';

export const PERMISSION_MODULES = [
    'deals',
    'pipelines',
    'contracts',
    'invoices',
    'subscriptions',
    'notifications',
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
        deals: allTrue(),
        pipelines: allTrue(),
        contracts: allTrue(),
        invoices: allTrue(),
        subscriptions: allTrue(),
        notifications: withOverrides(allTrue(), { create: false, delete: false, assign: false, status_change: false }),
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
        deals: allTrue(),
        pipelines: allTrue(),
        contracts: allTrue(),
        invoices: allTrue(),
        subscriptions: allTrue(),
        notifications: withOverrides(allTrue(), { create: false, delete: false, assign: false, status_change: false }),
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
        deals: withOverrides(allTrue(), { delete: false, assign: false }),
        pipelines: withOverrides(allTrue(), { delete: false, assign: false }),
        contracts: withOverrides(allTrue(), { delete: false, assign: false }),
        invoices: withOverrides(allTrue(), { delete: false, assign: false }),
        subscriptions: withOverrides(allTrue(), { delete: false, assign: false }),
        notifications: withOverrides(allTrue(), { create: false, delete: false, assign: false, status_change: false }),
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
        deals: withOverrides(allTrue(), { delete: false, assign: false }),
        pipelines: withOverrides(allTrue(), { delete: false, assign: false }),
        contracts: withOverrides(allTrue(), { delete: false, assign: false }),
        invoices: withOverrides(allTrue(), { delete: false, assign: false }),
        subscriptions: withOverrides(allTrue(), { delete: false, assign: false }),
        notifications: withOverrides(allTrue(), { create: false, delete: false, assign: false, status_change: false }),
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
        deals: withOverrides(allTrue(), { delete: false, assign: false }),
        pipelines: withOverrides(allTrue(), { delete: false, assign: false }),
        contracts: withOverrides(allTrue(), { delete: false, assign: false }),
        invoices: withOverrides(allTrue(), { delete: false, assign: false }),
        subscriptions: withOverrides(allTrue(), { delete: false, assign: false }),
        notifications: withOverrides(allTrue(), { create: false, delete: false, assign: false, status_change: false }),
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

// ---------------------------------------------------------------------------
// TTL permission cache — avoids a DB hit on every protected request.
// TTL of 60 s is safe because permissions change infrequently.
// ---------------------------------------------------------------------------
const permissionCache = new Map<string, { value: RolePermissions; expiresAt: number }>();
const PERMISSION_CACHE_TTL_MS = 60_000;

function getCachedPermissions(key: string): RolePermissions | undefined {
    const entry = permissionCache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
        permissionCache.delete(key);
        return undefined;
    }
    return entry.value;
}

function setCachedPermissions(key: string, value: RolePermissions): void {
    permissionCache.set(key, { value, expiresAt: Date.now() + PERMISSION_CACHE_TTL_MS });
}

// Periodic cleanup to prevent unbounded memory growth
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of permissionCache) {
        if (now > entry.expiresAt) permissionCache.delete(key);
    }
}, 120_000);

export const getEffectivePermissions = async (role: string, tenantId?: string): Promise<RolePermissions> => {
    const defaults = DEFAULT_ROLE_PERMISSIONS[role] || emptyPermissions();
    if (canUseOfflineMode()) {
        return defaults;
    }

    const cacheKey = `perm:${role}:${tenantId ?? 'global'}`;
    const cached = getCachedPermissions(cacheKey);
    if (cached) return cached;

    const query: Record<string, unknown> = { role };
    if (tenantId) query.tenantId = tenantId;
    const stored = await RolePermission.findOne(query).lean();
    const overrides = stored?.permissions || {};
    const result = mergePermissions(defaults, overrides);

    setCachedPermissions(cacheKey, result);
    return result;
};
