import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '../store/slices/authSlice';
import App from '../App';
import { ROUTES } from '../routes';

const buildStore = (authOverride?: Partial<{
    user: {
        id: string;
        _id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        status: string;
    } | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
}>) => configureStore({
    reducer: {
        auth: authReducer,
    },
    preloadedState: {
        auth: {
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            loading: false,
            error: null,
            ...authOverride,
        },
    },
});

const renderApp = (initialEntry: string, authOverride?: Parameters<typeof buildStore>[0]) => {
    const store = buildStore(authOverride);

    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[initialEntry]}>
                <App />
            </MemoryRouter>
        </Provider>
    );
};

describe('auth and route guards', () => {
    it('redirects unauthenticated users away from protected routes', async () => {
        renderApp(ROUTES.dashboard);

        expect(await screen.findByRole('heading', { name: /welcome back/i }, { timeout: 4000 })).toBeInTheDocument();
    });

    it('blocks non-admin users from the users route', async () => {
        renderApp(ROUTES.users, {
            isAuthenticated: true,
            token: 'token',
            refreshToken: 'refresh-token',
            user: {
                id: 'u-1',
                _id: 'u-1',
                email: 'manager@example.com',
                firstName: 'Maya',
                lastName: 'Manager',
                role: 'Manager',
                status: 'Active',
            },
        });

        expect(await screen.findByRole('heading', { name: /not authorized/i }, { timeout: 4000 })).toBeInTheDocument();
    });

    it('returns authenticated users to login when auth:unauthorized is emitted', async () => {
        renderApp(ROUTES.unauthorized, {
            isAuthenticated: true,
            token: 'token',
            refreshToken: 'refresh-token',
            user: {
                id: 'u-2',
                _id: 'u-2',
                email: 'operator@example.com',
                firstName: 'Omar',
                lastName: 'Operator',
                role: 'Operator',
                status: 'Active',
            },
        });

        expect(await screen.findByRole('heading', { name: /not authorized/i }, { timeout: 4000 })).toBeInTheDocument();

        act(() => {
            window.dispatchEvent(new Event('auth:unauthorized'));
        });

        expect(await screen.findByRole('heading', { name: /welcome back/i }, { timeout: 4000 })).toBeInTheDocument();
    });
});
