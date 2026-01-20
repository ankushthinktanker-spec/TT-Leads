import Role from '../models/role.model';

const DEFAULT_ROLES = [
    { name: 'Admin', description: 'Full system access', isSystem: true },
    { name: 'Manager', description: 'Team oversight and management', isSystem: true },
    { name: 'BDM', description: 'Business development executive', isSystem: true },
    { name: 'Marketing', description: 'Marketing operations', isSystem: true },
    { name: 'User', description: 'Standard user access', isSystem: true }
];

export const ensureDefaultRoles = async (): Promise<void> => {
    const existing = await Role.find({ name: { $in: DEFAULT_ROLES.map((role) => role.name) } }).lean();
    const existingNames = new Set(existing.map((role) => role.name));

    const missing = DEFAULT_ROLES.filter((role) => !existingNames.has(role.name));
    if (missing.length === 0) return;

    await Role.insertMany(missing);
};
