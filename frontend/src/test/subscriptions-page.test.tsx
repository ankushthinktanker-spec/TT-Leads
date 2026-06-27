import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubscriptionsPage from '../pages/subscriptions/SubscriptionsPage';

const {
    mockDispatch,
    showToastMock,
    fetchSubscriptionsMock,
    createSubscriptionMock,
    updateSubscriptionMock,
    deleteSubscriptionMock,
    fetchCompaniesMock,
    fetchUsersMock,
} = vi.hoisted(() => ({
    mockDispatch: vi.fn(),
    showToastMock: vi.fn(),
    fetchSubscriptionsMock: vi.fn((payload: unknown) => ({ type: 'subscriptions/fetchList', payload })),
    createSubscriptionMock: vi.fn((payload: unknown) => ({ type: 'subscriptions/create', payload })),
    updateSubscriptionMock: vi.fn((payload: unknown) => ({ type: 'subscriptions/update', payload })),
    deleteSubscriptionMock: vi.fn((payload: unknown) => ({ type: 'subscriptions/remove', payload })),
    fetchCompaniesMock: vi.fn((payload: unknown) => ({ type: 'companies/fetchCompanies', payload })),
    fetchUsersMock: vi.fn((payload: unknown) => ({ type: 'users/fetchUsers', payload })),
}));

let createShouldFail = false;

const mockState = {
    subscriptions: {
        items: [],
        loading: false,
        error: null,
        pagination: {
            page: 1,
            totalPages: 1,
            total: 0,
        },
    },
    companies: {
        items: [
            { _id: 'company-1', name: 'Northwind Labs' },
        ],
    },
    users: {
        users: [
            { _id: 'owner-1', firstName: 'Maya', lastName: 'Singh' },
        ],
    },
    auth: {
        user: {
            _id: 'admin-1',
            role: 'Admin',
        },
    },
};

vi.mock('../hooks/redux', () => ({
    useAppDispatch: () => mockDispatch,
    useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../store/slices/subscriptionSlice', () => ({
    fetchSubscriptions: fetchSubscriptionsMock,
    createSubscription: createSubscriptionMock,
    updateSubscription: updateSubscriptionMock,
    deleteSubscription: deleteSubscriptionMock,
}));

vi.mock('../store/slices/companySlice', () => ({
    fetchCompanies: fetchCompaniesMock,
}));

vi.mock('../store/slices/userSlice', () => ({
    fetchUsers: fetchUsersMock,
}));

vi.mock('../utils/toast', () => ({
    showToast: showToastMock,
}));

vi.mock('../context/GlobalSearchContext', () => ({
    useGlobalSearch: () => ({
        value: '',
        setValue: vi.fn(),
    }),
}));

vi.mock('../components/ui/ConfirmDialog', () => ({
    default: () => null,
}));

vi.mock('../components/module-system', () => ({
    ModulePageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    ModulePageHeader: ({ title, actions }: { title: string; actions?: React.ReactNode }) => (
        <div>
            <h1>{title}</h1>
            {actions}
        </div>
    ),
    ModuleToolbar: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    ModuleSummaryCards: () => null,
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

const getFieldControl = (dialog: HTMLElement, label: string) => {
    const labelNode = within(dialog).getByText(label);
    const control = labelNode.nextElementSibling;
    if (!control) {
        throw new Error(`No control found for label ${label}`);
    }
    return control as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
};

describe('SubscriptionsPage modal flow', () => {
    beforeEach(() => {
        createShouldFail = false;
        showToastMock.mockReset();
        fetchSubscriptionsMock.mockClear();
        createSubscriptionMock.mockClear();
        updateSubscriptionMock.mockClear();
        deleteSubscriptionMock.mockClear();
        fetchCompaniesMock.mockClear();
        fetchUsersMock.mockClear();
        mockDispatch.mockReset();
        mockDispatch.mockImplementation((action: { type?: string }) => {
            if (action.type === 'subscriptions/create') {
                return {
                    unwrap: () => createShouldFail ? Promise.reject(new Error('failed')) : Promise.resolve({}),
                };
            }

            return Promise.resolve(action);
        });
    });

    it('creates a subscription, shows success feedback, and refreshes the list', async () => {
        render(<SubscriptionsPage />);

        fireEvent.click(screen.getByRole('button', { name: /add subscription/i }));

        const dialog = screen.getByRole('dialog', { name: /add subscription/i });
        fireEvent.change(getFieldControl(dialog, 'Name'), { target: { value: 'CRM License' } });
        fireEvent.change(getFieldControl(dialog, 'Owner'), { target: { value: 'owner-1' } });
        fireEvent.change(getFieldControl(dialog, 'Renew Date'), { target: { value: '2026-06-15' } });

        fireEvent.click(within(dialog).getByRole('button', { name: /create subscription/i }));

        await waitFor(() => {
            expect(showToastMock).toHaveBeenCalledWith('Subscription created.', 'success');
        });

        expect(createSubscriptionMock).toHaveBeenCalledWith(expect.objectContaining({
            name: 'CRM License',
            internalOwnerId: 'owner-1',
            renewDate: '2026-06-15',
            type: 'Other',
            billingCycle: 'Monthly',
            status: 'Active',
            currency: 'INR',
        }));
        expect(fetchSubscriptionsMock).toHaveBeenCalledWith({
            page: 1,
            limit: 20,
            sortOrder: 'desc',
        });
    });

    it('shows error feedback and skips the refresh when create fails', async () => {
        createShouldFail = true;
        render(<SubscriptionsPage />);

        await waitFor(() => {
            expect(fetchSubscriptionsMock).toHaveBeenCalled();
        });
        const fetchCallCountBeforeSubmit = fetchSubscriptionsMock.mock.calls.length;

        fireEvent.click(screen.getByRole('button', { name: /add subscription/i }));

        const dialog = screen.getByRole('dialog', { name: /add subscription/i });
        fireEvent.change(getFieldControl(dialog, 'Name'), { target: { value: 'CRM License' } });
        fireEvent.change(getFieldControl(dialog, 'Owner'), { target: { value: 'owner-1' } });
        fireEvent.change(getFieldControl(dialog, 'Renew Date'), { target: { value: '2026-06-15' } });

        fireEvent.click(within(dialog).getByRole('button', { name: /create subscription/i }));

        await waitFor(() => {
            expect(showToastMock).toHaveBeenCalledWith('Failed to save subscription.', 'error');
        });

        expect(createSubscriptionMock).toHaveBeenCalled();
        expect(fetchSubscriptionsMock).toHaveBeenCalledTimes(fetchCallCountBeforeSubmit);
    });
});
