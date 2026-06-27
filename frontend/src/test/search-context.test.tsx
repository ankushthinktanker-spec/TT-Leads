import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { GlobalSearchProvider } from '../context/GlobalSearchContext';
import { ROUTES } from '../routes';

const renderSearchHarness = (initialEntry: string) => {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <GlobalSearchProvider>
                <Navbar />
                <nav>
                    <Link to={ROUTES.leads}>Leads</Link>
                    <Link to={ROUTES.companies}>Companies</Link>
                    <Link to={ROUTES.dashboard}>Dashboard</Link>
                </nav>
                <Routes>
                    <Route path={ROUTES.leads} element={<div>Leads page</div>} />
                    <Route path={ROUTES.companies} element={<div>Companies page</div>} />
                    <Route path={ROUTES.dashboard} element={<div>Dashboard page</div>} />
                </Routes>
            </GlobalSearchProvider>
        </MemoryRouter>
    );
};

describe('route scoped search', () => {
    it('stores search values per route instead of sharing one global value', async () => {
        renderSearchHarness(ROUTES.leads);

        const searchInput = screen.getByRole('textbox', { name: /lead search/i });
        fireEvent.change(searchInput, { target: { value: 'alpha lead' } });
        expect(searchInput).toHaveValue('alpha lead');

        fireEvent.click(screen.getByRole('link', { name: 'Companies' }));

        const companyInput = screen.getByRole('textbox', { name: /company search/i });
        expect(companyInput).toHaveValue('');
        fireEvent.change(companyInput, { target: { value: 'beta company' } });
        expect(companyInput).toHaveValue('beta company');

        fireEvent.click(screen.getByRole('link', { name: 'Leads' }));
        expect(screen.getByRole('textbox', { name: /lead search/i })).toHaveValue('alpha lead');
    });

    it('shows page context instead of search on unsupported pages', async () => {
        renderSearchHarness(ROUTES.dashboard);

        expect(screen.queryByRole('textbox', { name: /page search/i })).not.toBeInTheDocument();
        expect(screen.getAllByText('Command center').length).toBeGreaterThan(0);
    });
});
