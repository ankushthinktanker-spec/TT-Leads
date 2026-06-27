import assert from 'node:assert/strict';
import { createSuite } from './framework';
import { parseRuntimeMode, shouldAllowDevOffline } from '../config/mode';
import { validateRuntimeConfig } from '../config/validateRuntime';
import { canUseOfflineMode, setDatabaseReady, setRuntimeMode } from '../config/runtime';

export const runtimeConfigSuite = createSuite('runtime config', [
    {
        name: 'defaults to dev mode when unset',
        run: () => {
            assert.equal(parseRuntimeMode(undefined), 'dev');
        },
    },
    {
        name: 'rejects unsupported runtime modes',
        run: () => {
            assert.throws(
                () => parseRuntimeMode('staging-ish'),
                /Unsupported runtime mode: staging-ish/
            );
        },
    },
    {
        name: 'release mode requires mongo and jwt secrets',
        run: () => {
            assert.throws(
                () => validateRuntimeConfig({
                    NODE_ENV: 'production',
                    RUNTIME_MODE: 'release',
                    MONGODB_URI: '',
                    JWT_SECRET: '',
                }),
                /Missing required environment: MONGODB_URI/
            );
        },
    },
    {
        name: 'test mode requires test mongo and jwt secrets',
        run: () => {
            assert.throws(
                () => validateRuntimeConfig({
                    NODE_ENV: 'test',
                    RUNTIME_MODE: 'test',
                    TEST_MONGODB_URI: '',
                    JWT_SECRET: '',
                }),
                /Missing required environment: TEST_MONGODB_URI/
            );
        },
    },
    {
        name: 'dev offline fallback is only allowed in dev mode',
        run: () => {
            assert.equal(
                shouldAllowDevOffline({
                    runtimeMode: 'release',
                    allowDevOffline: true,
                    nodeEnv: 'production',
                }),
                false
            );
            assert.equal(
                shouldAllowDevOffline({
                    runtimeMode: 'dev',
                    allowDevOffline: true,
                    nodeEnv: 'development',
                }),
                true
            );
        },
    },
    {
        name: 'release mode cannot use offline fallback while database is unavailable',
        run: () => {
            const originalNodeEnv = process.env.NODE_ENV;
            const originalAllowDevOffline = process.env.ALLOW_DEV_OFFLINE;

            process.env.NODE_ENV = 'development';
            process.env.ALLOW_DEV_OFFLINE = 'true';
            setRuntimeMode('release');
            setDatabaseReady(false);
            assert.equal(canUseOfflineMode(), false);

            if (originalNodeEnv === undefined) {
                delete process.env.NODE_ENV;
            } else {
                process.env.NODE_ENV = originalNodeEnv;
            }

            if (originalAllowDevOffline === undefined) {
                delete process.env.ALLOW_DEV_OFFLINE;
            } else {
                process.env.ALLOW_DEV_OFFLINE = originalAllowDevOffline;
            }

            setRuntimeMode('dev');
        },
    },
]);
