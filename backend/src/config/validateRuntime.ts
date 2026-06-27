import { parseRuntimeMode, type RuntimeMode } from './mode';

type RuntimeEnv = {
    NODE_ENV?: string;
    RUNTIME_MODE?: string;
    MONGODB_URI?: string;
    TEST_MONGODB_URI?: string;
    JWT_SECRET?: string;
    [key: string]: string | undefined;
};

export const validateRuntimeConfig = (env: RuntimeEnv): { runtimeMode: RuntimeMode } => {
    const runtimeMode = parseRuntimeMode(env.RUNTIME_MODE);
    const requiredKeys =
        runtimeMode === 'test'
            ? ['TEST_MONGODB_URI', 'JWT_SECRET']
            : runtimeMode === 'release'
                ? ['MONGODB_URI', 'JWT_SECRET']
                : [];

    for (const key of requiredKeys) {
        const value = env[key as keyof RuntimeEnv];
        if (!value || !String(value).trim()) {
            throw new Error(`Missing required environment: ${key}`);
        }
    }

    return { runtimeMode };
};
