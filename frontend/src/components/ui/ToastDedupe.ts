type ToastKey = string;

const recentToasts = new Map<ToastKey, number>();

export const buildToastKey = (message: string, type?: string) => {
    const trimmed = message.trim();
    return type ? `${type}:${trimmed}` : trimmed;
};

export const shouldShowToast = (message: string, type?: string, windowMs = 10000) => {
    const key = buildToastKey(message, type);
    const now = Date.now();
    const last = recentToasts.get(key);
    if (last && now - last < windowMs) {
        return false;
    }
    recentToasts.set(key, now);
    return true;
};

export const resetToastDedupe = () => {
    recentToasts.clear();
};
