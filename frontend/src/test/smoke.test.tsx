import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { store } from '../store';
import { ROUTES } from '../routes';

const renderApp = (initialEntry: string) => {
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[initialEntry]}>
                <App />
            </MemoryRouter>
        </Provider>
    );
};

describe('app smoke', () => {
    it('renders login flow for unauthenticated users', async () => {
        renderApp('/');
        expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    it('renders forgot password page', async () => {
        renderApp(ROUTES.forgotPassword);
        expect(await screen.findByRole('heading', { name: /forgot password/i })).toBeInTheDocument();
    });
});
