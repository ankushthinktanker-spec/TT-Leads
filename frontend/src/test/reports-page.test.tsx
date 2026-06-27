import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReportsPage from '../pages/reports/ReportsPage';

const { mockDispatch, fetchReportMock } = vi.hoisted(() => ({
    mockDispatch: vi.fn(),
    fetchReportMock: vi.fn((payload: unknown) => ({ type: 'reports/fetchReport', payload })),
}));

const mockState = {
    reports: {
        rows: [
            {
                _id: 'lead-1',
                tenantId: 'tenant-1',
                leadNumber: 'LD-1001',
                firstName: 'Asha',
                lastName: 'Patel',
                company: 'Northstar Labs',
                status: 'Qualified',
                source: 'Website',
                priority: 'Hot',
                dealValue: 250000,
                location: { city: 'Mumbai', country: 'India' },
                createdAt: '2026-05-26T10:30:00.000Z',
            },
        ],
        loading: false,
        error: null,
        reportKey: '/reports/leads/register',
    },
    auth: {
        user: {
            role: 'Admin',
        },
    },
};

vi.mock('../hooks/redux', () => ({
    useAppDispatch: () => mockDispatch,
    useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../store/slices/reportsSlice', async () => {
    const actual = await vi.importActual<typeof import('../store/slices/reportsSlice')>('../store/slices/reportsSlice');
    return {
        ...actual,
        fetchReport: fetchReportMock,
    };
});

vi.mock('../components/module-system', () => ({
    ModulePageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    ModulePageHeader: ({ title, description }: { title: string; description?: string }) => (
        <div>
            <h1>{title}</h1>
            {description ? <p>{description}</p> : null}
        </div>
    ),
    ModuleSummaryCards: () => null,
    ModuleToolbar: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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
        <select aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)}>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    ),
    ModuleDataTable: ({
        rows,
        columns,
        tableTitle,
    }: {
        rows: Array<Record<string, unknown>>;
        columns: Array<{ id: string; header: string; cell: (row: Record<string, unknown>) => React.ReactNode }>;
        tableTitle?: string;
    }) => (
        <section>
            <h2>{tableTitle}</h2>
            <div>
                {columns.map((column) => (
                    <span key={column.id}>{column.header}</span>
                ))}
            </div>
            {rows.map((row, rowIndex) => (
                <div key={`row-${rowIndex}`}>
                    {columns.map((column) => (
                        <div key={column.id}>{column.cell(row)}</div>
                    ))}
                </div>
            ))}
        </section>
    ),
}));

describe('ReportsPage formatting', () => {
    it('formats lead register rows into readable business columns', () => {
        render(<ReportsPage />);

        expect(screen.getByRole('heading', { name: 'Reports' })).toBeInTheDocument();
        expect(screen.getByText('Lead #')).toBeInTheDocument();
        expect(screen.getByText('Asha Patel')).toBeInTheDocument();
        expect(screen.getByText('Mumbai, India')).toBeInTheDocument();
        expect(screen.getByText(/₹2,50,000/)).toBeInTheDocument();
        expect(screen.queryByText('tenantId')).not.toBeInTheDocument();
        expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
    });
});
