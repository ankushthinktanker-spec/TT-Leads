const TOKEN_KEY = 'token';
const REFRESH_KEY = 'refreshToken';
const USER_KEY = 'user';
const STORAGE_FLAG = 'authStorage';

type StorageType = 'local' | 'session';

const getStorage = (type: StorageType) => (type === 'local' ? localStorage : sessionStorage);

const getStoredType = (): StorageType => {
    const flag = localStorage.getItem(STORAGE_FLAG);
    return flag === 'session' ? 'session' : 'local';
};

const setStoredType = (type: StorageType) => {
    localStorage.setItem(STORAGE_FLAG, type);
};

export const getAccessToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
    return localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY);
};

export const getStoredUser = (): unknown | null => {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    try {
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const setTokens = (token: string, refreshToken: string, remember: boolean) => {
    const type: StorageType = remember ? 'local' : 'session';
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    const storage = getStorage(type);
    storage.setItem(TOKEN_KEY, token);
    storage.setItem(REFRESH_KEY, refreshToken);
    setStoredType(type);
};

export const setStoredUser = (user: unknown, remember: boolean) => {
    const type: StorageType = remember ? 'local' : 'session';
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
    getStorage(type).setItem(USER_KEY, JSON.stringify(user));
    setStoredType(type);
};

export const clearAuthStorage = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(STORAGE_FLAG);
};

export const isTokenExpired = (token?: string | null): boolean => {
    if (!token) return true;
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    try {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (!payload?.exp) return false;
        return Date.now() >= payload.exp * 1000;
    } catch {
        return true;
    }
};

export const getTokenStorageType = (): StorageType => {
    const stored = getStoredType();
    if (stored === 'session' && sessionStorage.getItem(TOKEN_KEY)) {
        return 'session';
    }
    return 'local';
};
