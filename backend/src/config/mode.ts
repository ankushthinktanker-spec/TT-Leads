export type RuntimeMode = 'dev' | 'test' | 'release';

export const parseRuntimeMode = (value: string | undefined): RuntimeMode => {
    const normalized = (value || 'dev').trim().toLowerCase();

    if (normalized === 'dev' || normalized === 'test' || normalized === 'release') {
        return normalized;
    }

    throw new Error(`Unsupported runtime mode: ${value}`);
};

export const shouldAllowDevOffline = ({
    runtimeMode,
    allowDevOffline,
    nodeEnv,
}: {
    runtimeMode: RuntimeMode;
    allowDevOffline: boolean;
    nodeEnv: string;
}) =>
    runtimeMode === 'dev' &&
    nodeEnv === 'development' &&
    allowDevOffline;
