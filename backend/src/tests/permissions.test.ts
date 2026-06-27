import assert from 'node:assert/strict';
import { createSuite } from './framework';
import {
    DEFAULT_ROLE_PERMISSIONS,
    emptyPermissions,
    mergePermissions,
    sanitizePermissions,
} from '../utils/permission.utils';
import { can, ensureOwnership } from '../utils/policy.utils';
import { authorize, type AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

const createNext = () => {
    let error: unknown;
    let called = false;

    return {
        next: (err?: unknown) => {
            called = true;
            error = err;
        },
        getResult: () => ({ called, error }),
    };
};

export const permissionsSuite = createSuite('permissions', [
    {
        name: 'emptyPermissions denies every module action by default',
        run: () => {
            const permissions = emptyPermissions();
            assert.equal(can(permissions, 'users', 'view'), false);
            assert.equal(can(permissions, 'leads', 'create'), false);
        },
    },
    {
        name: 'mergePermissions preserves defaults and applies overrides',
        run: () => {
            const merged = mergePermissions(DEFAULT_ROLE_PERMISSIONS.BDM, {
                leads: {
                    ...DEFAULT_ROLE_PERMISSIONS.BDM.leads,
                    delete: true,
                },
            });

            assert.equal(merged.leads.delete, true);
            assert.equal(merged.reports.view, true);
            assert.equal(merged.users.view, false);
        },
    },
    {
        name: 'sanitizePermissions keeps only known boolean permission keys',
        run: () => {
            const sanitized = sanitizePermissions({
                leads: {
                    view: true,
                    delete: false,
                    unexpected: true,
                },
                unknownModule: {
                    view: true,
                },
                users: 'invalid',
            });

            assert.deepEqual(sanitized, {
                leads: {
                    view: true,
                    delete: false,
                },
            });
        },
    },
    {
        name: 'authorize passes when the user role is allowed',
        run: () => {
            const middleware = authorize('Admin', 'Manager');
            const req = {
                user: { role: 'Manager' },
            } as AuthRequest;
            const { next, getResult } = createNext();

            middleware(req, {} as never, next);

            assert.deepEqual(getResult(), { called: true, error: undefined });
        },
    },
    {
        name: 'authorize returns AppError when role is forbidden',
        run: () => {
            const middleware = authorize('Admin');
            const req = {
                user: { role: 'Operator' },
            } as AuthRequest;
            const { next } = createNext();

            assert.throws(
                () => middleware(req, {} as never, next),
                (error: unknown) => {
                    assert.ok(error instanceof AppError);
                    assert.equal((error as AppError).statusCode, 403);
                    return true;
                }
            );
        },
    },
    {
        name: 'ensureOwnership throws a 403 style error for unscoped access',
        run: () => {
            assert.throws(
                () => ensureOwnership(false, 'Scoped access only'),
                (error: unknown) => {
                    assert.ok(error instanceof Error);
                    assert.equal((error as Error & { statusCode?: number }).statusCode, 403);
                    assert.equal((error as Error).message, 'Scoped access only');
                    return true;
                }
            );
        },
    },
]);
