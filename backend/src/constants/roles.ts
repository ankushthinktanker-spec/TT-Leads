/**
 * Canonical role name constants.
 * Use these instead of string literals throughout the codebase to prevent
 * typos and make role renames safe across all RBAC comparisons.
 *
 * NOTE: DB enum definitions (Mongoose schema `enum: [...]`), seed scripts,
 * and DEFAULT_ROLE_PERMISSIONS keys intentionally remain as string literals
 * because they are data-facing, not RBAC-comparison-facing.
 */
export const Roles = {
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    BDM: 'BDM',
    USER: 'User',
} as const;

export type Role = typeof Roles[keyof typeof Roles];
