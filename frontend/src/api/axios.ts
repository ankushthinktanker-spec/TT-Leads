import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
    getAccessToken,
    getRefreshToken,
    setTokens,
    clearAuthStorage,
    isTokenExpired,
    getTokenStorageType
} from '../utils/authStorage';

// Create axios instance
const api = axios.create({
    baseURL: '/api', // Use Vite proxy
    headers: {
        'Content-Type': 'application/json',
    },
});

type AuthRequestConfig = InternalAxiosRequestConfig & {
    _skipAuth?: boolean;
    _retry?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
    if (refreshPromise) {
        return refreshPromise;
    }
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    refreshPromise = axios.post('/api/auth/refresh-token', { refreshToken }, { headers: { 'Content-Type': 'application/json' } })
        .then((response) => {
            const token = response.data?.data?.token;
            const newRefreshToken = response.data?.data?.refreshToken;
            if (token && newRefreshToken) {
                const remember = getTokenStorageType() === 'local';
                setTokens(token, newRefreshToken, remember);
                return token;
            }
            return null;
        })
        .catch(() => null)
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
};

// Request interceptor for adding the auth token
api.interceptors.request.use(
    async (config: AuthRequestConfig) => {
        if (config._skipAuth) {
            return config;
        }
        let token = getAccessToken();
        if (token && isTokenExpired(token)) {
            token = await refreshAccessToken();
        }
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for handling errors
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = (error.config || {}) as AuthRequestConfig;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const token = await refreshAccessToken();
            if (token) {
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
            }
        }
        if (error.response && error.response.status === 401) {
            clearAuthStorage();
            window.dispatchEvent(new Event('auth:unauthorized'));
        }
        return Promise.reject(error);
    }
);

export default api;
