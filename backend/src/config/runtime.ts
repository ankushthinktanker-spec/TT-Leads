import mongoose from 'mongoose';
import { parseRuntimeMode, shouldAllowDevOffline, type RuntimeMode } from './mode';

let databaseReady = false;
let runtimeMode: RuntimeMode = 'dev';

const isDevOfflineEnabled = () => String(process.env.ALLOW_DEV_OFFLINE ?? 'true').toLowerCase() !== 'false';

export const setRuntimeMode = (value: string | undefined) => {
    runtimeMode = parseRuntimeMode(value);
};

export const getRuntimeMode = () => runtimeMode;

export const setDatabaseReady = (ready: boolean) => {
    databaseReady = ready;
};

export const isDatabaseReady = () => databaseReady && mongoose.connection.readyState === 1;

export const canUseOfflineMode = () =>
    shouldAllowDevOffline({
        runtimeMode,
        allowDevOffline: isDevOfflineEnabled(),
        nodeEnv: process.env.NODE_ENV || 'development',
    }) &&
    !isDatabaseReady();

export const getOfflineAdminProfile = () => ({
    id: '000000000000000000000001',
    _id: '000000000000000000000001',
    email: process.env.ADMIN_EMAIL || 'admin@thinktanker.in',
    firstName: process.env.ADMIN_FIRST_NAME || 'Workspace',
    lastName: process.env.ADMIN_LAST_NAME || 'Admin',
    role: 'Admin',
    status: 'Active',
    tenantId: '0000000000000000000000aa',
});
