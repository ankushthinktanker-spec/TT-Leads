import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postMock, clearAuthStorageMock } = vi.hoisted(() => ({
    postMock: vi.fn(),
    clearAuthStorageMock: vi.fn(),
}));

vi.mock('../api/axios', () => ({
    __esModule: true,
    default: {
        post: postMock,
    },
}));

vi.mock('../utils/authStorage', () => ({
    getAccessToken: () => 'token-123',
    getStoredUser: () => ({
        id: 'user-1',
        _id: 'user-1',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'Admin',
        status: 'Active',
    }),
    setTokens: vi.fn(),
    setStoredUser: vi.fn(),
    clearAuthStorage: clearAuthStorageMock,
    isTokenExpired: () => false,
    getTokenStorageType: () => 'local',
}));

import authReducer, { logout } from '../store/slices/authSlice';

describe('auth logout thunk', () => {
    beforeEach(() => {
        postMock.mockReset();
        clearAuthStorageMock.mockReset();
        postMock.mockResolvedValue({ data: { success: true } });
    });

    it('calls the protected backend logout route with auth enabled and clears local auth state', async () => {
        const store = configureStore({
            reducer: {
                auth: authReducer,
            },
        });

        await store.dispatch(logout());

        expect(postMock).toHaveBeenCalledWith('/auth/logout');
        expect(clearAuthStorageMock).toHaveBeenCalledTimes(1);
        expect(store.getState().auth.isAuthenticated).toBe(false);
        expect(store.getState().auth.user).toBeNull();
        expect(store.getState().auth.token).toBeNull();
    });
});
