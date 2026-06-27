import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LeadsPage } from '../pages/leads/LeadsPage';

const {
    mockDispatch,
    mockSetQuery,
    fetchLeadsMock,
    fetchUsersMock,
} = vi.hoisted(() => ({
    mockDispatch: vi.fn(),
    mockSetQuery: vi.fn(),
    fetchLeadsMock: vi.fn((payload: unknown) => ({ type: 'leads/fetchLeads', payload })),
    fetchUsersMock: vi.fn((payload: unknown) => ({ type: 'users/fetchUsers', payload })),
}));

const mockState = {
    leads: {
        leads: [
            {
                _id: 'lead-1',
                leadNumber: 'L-001',
                firstName: 'Ava',
                lastName: 'Stone',
                email: 'ava@example.com',
                phone: '9999999999',
                company: 'Northwind',
                status: 'New',
                priority: 'Warm',
                source: 'Website',
                createdAt: '2026-05-18T00:00:00.000Z',
                updatedAt: '2026-05-19T00:00:00.000Z',
            },
        ],
        loading: false,
        error: null,
        page: 1,
        totalPages: 1,
        total: 1,
    },
    users: {
        users: [
            { _id: 'owner-1', firstName: 'Maya', lastName: 'Singh' },
        ],
    },
};

vi.mock('../hooks/redux', () => ({
    useAppDispatch: () => mockDispatch,
    useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../store/slices/leadSlice', () => ({
    fetchLeads: fetchLeadsMock,
    deleteLead: vi.fn(),
}));

vi.mock('../store/slices/userSlice', () => ({
    fetchUsers: fetchUsersMock,
}));

vi.mock('../context/GlobalSearchContext', () => ({
    useGlobalSearch: () => ({
        value: '',
        setValue: mockSetQuery,
    }),
}));

vi.mock('../utils/toast', () => ({
    showToast: vi.fn(),
}));

vi.mock('../components/ui/ConfirmDialog', () => ({
    default: () => null,
}));

vi.mock('../components/ui/InlineAlert', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/module-system', () => ({
    ModulePageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    ModulePageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
    ModuleSummaryCards: () => null,
    ModuleToolbar: ({ filterContent, children }: { filterContent?: React.ReactNode; children?: React.ReactNode }) => (
        <div>
            {filterContent}
            {children}
        </div>
    ),
    ModuleFilterDropdown: ({
        value,
        options,
        onChange,
        ariaLabel,
    }: {
        value: string;
        options: Array<{ label: string; value: string }>;
        onChange: (value: string) => void;
        ariaLabel?: string;
    }) => (
        <select
            aria-label={ariaLabel}
            value={value}
            onChange={(event) => onChange(event.target.value)}
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    ),
    ModuleDataTable: () => null,
    ModuleBadge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    ModuleRowActions: () => null,
}));

describe('LeadsPage filters', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'));
        mockDispatch.mockReset();
        mockSetQuery.mockReset();
        fetchLeadsMock.mockClear();
        fetchUsersMock.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('sends backend-compatible startDate and endDate when created-within filter changes', () => {
        render(
            <MemoryRouter>
                <LeadsPage />
            </MemoryRouter>
        );

        const dateRangeLabel = screen.getByText('Created Within');
        const dateRangeSelect = dateRangeLabel.nextElementSibling as HTMLSelectElement;
        fireEvent.change(dateRangeSelect, { target: { value: '30' } });

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(fetchUsersMock).toHaveBeenCalledWith({ limit: 100 });
        expect(fetchLeadsMock).toHaveBeenCalled();

        const lastFetchArgs = fetchLeadsMock.mock.calls.at(-1)?.[0] as Record<string, string | number>;
        expect(lastFetchArgs).toMatchObject({
            page: 1,
            limit: 20,
            search: '',
            status: '',
            ownerId: '',
            source: '',
            sortBy: 'createdAt',
            sortOrder: 'desc',
        });

        expect(typeof lastFetchArgs.startDate).toBe('string');
        expect(typeof lastFetchArgs.endDate).toBe('string');

        const startDate = new Date(String(lastFetchArgs.startDate));
        const endDate = new Date(String(lastFetchArgs.endDate));
        const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        expect(diffDays).toBe(30);
        expect(endDate.toISOString()).toContain('2026-05-20T12:00:00.');
    });
});
