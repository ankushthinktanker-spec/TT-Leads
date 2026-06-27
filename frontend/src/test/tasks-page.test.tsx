import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TasksPage from '../pages/tasks/TasksPage';

const {
    mockDispatch,
    showToastMock,
    fetchTasksMock,
    deleteTaskMock,
    completeTaskMock,
} = vi.hoisted(() => ({
    mockDispatch: vi.fn(),
    showToastMock: vi.fn(),
    fetchTasksMock: vi.fn((payload: unknown) => ({ type: 'tasks/fetchTasks', payload })),
    deleteTaskMock: vi.fn((payload: unknown) => ({ type: 'tasks/deleteTask', payload })),
    completeTaskMock: vi.fn((payload: unknown) => ({ type: 'tasks/completeTask', payload })),
}));

let completeShouldFail = false;

const mockState = {
    tasks: {
        tasks: [
            {
                _id: 'task-1',
                title: 'Follow up with Northwind',
                description: 'Call procurement lead',
                dueDate: '2026-05-22T00:00:00.000Z',
                priority: 'High',
                status: 'Pending',
            },
        ],
        loading: false,
        error: null,
        pagination: {
            page: 1,
            totalPages: 1,
            total: 1,
        },
    },
};

vi.mock('../hooks/redux', () => ({
    useAppDispatch: () => mockDispatch,
    useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../store/slices/taskSlice', () => ({
    fetchTasks: fetchTasksMock,
    deleteTask: deleteTaskMock,
    completeTask: completeTaskMock,
}));

vi.mock('../components/tasks/TaskFormModal', () => ({
    default: () => null,
}));

vi.mock('../components/ui/ConfirmDialog', () => ({
    default: () => null,
}));

vi.mock('../components/ui/InlineAlert', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../utils/toast', () => ({
    showToast: showToastMock,
}));

vi.mock('../components/module-system', () => ({
    ModulePageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    ModulePageHeader: ({ title, actions }: { title: string; actions?: React.ReactNode }) => (
        <div>
            <h1>{title}</h1>
            {actions}
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
    ModuleDataTable: ({
        rows,
        columns,
    }: {
        rows: Array<Record<string, unknown>>;
        columns: Array<{ id: string; cell: (row: Record<string, unknown>) => React.ReactNode }>;
    }) => (
        <div>
            {rows.map((row) => (
                <div key={String(row._id)}>
                    {columns.map((column) => (
                        <div key={column.id}>{column.cell(row)}</div>
                    ))}
                </div>
            ))}
        </div>
    ),
    ModuleBadge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    ModuleRowActions: ({
        actions,
    }: {
        actions: Array<{ label: string; onClick: () => void }>;
    }) => (
        <div>
            {actions.map((action) => (
                <button key={action.label} onClick={action.onClick}>
                    {action.label}
                </button>
            ))}
        </div>
    ),
}));

describe('TasksPage action feedback', () => {
    beforeEach(() => {
        completeShouldFail = false;
        showToastMock.mockReset();
        fetchTasksMock.mockClear();
        deleteTaskMock.mockClear();
        completeTaskMock.mockClear();
        mockDispatch.mockReset();
        mockDispatch.mockImplementation((action: { type?: string }) => {
            if (action.type === 'tasks/completeTask') {
                return {
                    unwrap: () => completeShouldFail ? Promise.reject(new Error('failed')) : Promise.resolve({}),
                };
            }

            return Promise.resolve(action);
        });
    });

    it('shows success feedback and refreshes the list when task completion succeeds', async () => {
        render(<TasksPage />);

        fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));

        await waitFor(() => {
            expect(showToastMock).toHaveBeenCalledWith('Task marked as completed.', 'success');
        });

        expect(completeTaskMock).toHaveBeenCalledWith('task-1');
        expect(fetchTasksMock).toHaveBeenCalledWith({
            page: 1,
            status: '',
            priority: '',
            limit: 20,
        });
    });

    it('shows error feedback and skips the refresh when task completion fails', async () => {
        completeShouldFail = true;
        render(<TasksPage />);
        fetchTasksMock.mockClear();

        fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));

        await waitFor(() => {
            expect(showToastMock).toHaveBeenCalledWith('Failed to update task.', 'error');
        });

        expect(completeTaskMock).toHaveBeenCalledWith('task-1');
        expect(fetchTasksMock).not.toHaveBeenCalled();
    });
});
