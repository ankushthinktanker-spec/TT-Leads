import { PermissionAction, PermissionModule } from './permission.utils';

type PermissionMatrix = Record<string, Record<string, boolean>>;

export const can = (
    permissions: PermissionMatrix,
    moduleKey: PermissionModule,
    actionKey: PermissionAction
): boolean => {
    return Boolean(permissions?.[moduleKey]?.[actionKey]);
};

export const ensureOwnership = (
    isOwnerOrScoped: boolean,
    message = 'Not authorized to access this resource'
): void => {
    if (!isOwnerOrScoped) {
        const error = new Error(message) as Error & { statusCode?: number };
        error.statusCode = 403;
        throw error;
    }
};
