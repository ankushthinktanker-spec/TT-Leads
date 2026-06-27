import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchTasks, deleteTask, completeTask } from '../../store/slices/taskSlice';
import TaskFormModal from '../../components/tasks/TaskFormModal';
import {
    CheckCircle,
    Circle,
    Edit,
    Trash2,
    Calendar,
    AlertCircle,
    TimerReset,
    ListTodo,
    Plus,
    Inbox
} from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { showToast } from '../../utils/toast';
import {
    ModulePageShell,
    ModulePageHeader,
    ModuleToolbar,
    ModuleSummaryCards,
    ModuleDataTable,
    ModuleBadge,
    ModuleRowActions,
    type ModuleColumnDef,
    type ActiveFilter,
    type SummaryCardItem,
} from '../../components/module-system';

interface TaskRecord {
    _id: string;
    title: string;
    description?: string;
    dueDate: string;
    priority: 'High' | 'Medium' | 'Low';
    status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
}

const TasksPage = () => {
    const dispatch = useAppDispatch();
    const { tasks, loading, pagination, error } = useAppSelector((state) => state.tasks);

    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        dispatch(fetchTasks({
            page: currentPage,
            limit: 20,
            status: statusFilter,
            priority: priorityFilter
        }));
    }, [dispatch, currentPage, statusFilter, priorityFilter]);

    const activeFilters: ActiveFilter[] = [
        ...(statusFilter ? [{ key: 'status', label: `Status: ${statusFilter}`, onRemove: () => setStatusFilter('') }] : []),
        ...(priorityFilter ? [{ key: 'priority', label: `Priority: ${priorityFilter}`, onRemove: () => setPriorityFilter('') }] : []),
    ];

    const clearFilters = () => {
        setStatusFilter('');
        setPriorityFilter('');
        setCurrentPage(1);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        await dispatch(deleteTask(deleteId));
        setDeleteId(null);
        dispatch(fetchTasks({ page: currentPage, status: statusFilter, priority: priorityFilter, limit: 20 }));
        showToast('Task deleted successfully.', 'success');
    };

    const handleComplete = async (id: string, currentStatus: string) => {
        if (currentStatus === 'Completed') return;
        await dispatch(completeTask(id));
        dispatch(fetchTasks({ page: currentPage, status: statusFilter, priority: priorityFilter, limit: 20 }));
        showToast('Task marked as completed.', 'success');
    };

    const handleEdit = (task: TaskRecord) => {
        setEditingTask(task);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingTask(null);
        dispatch(fetchTasks({ page: currentPage, status: statusFilter, priority: priorityFilter, limit: 20 }));
    };

    const isOverdue = (dueDate: string, status: string) => {
        if (status === 'Completed' || status === 'Cancelled') return false;
        return new Date(dueDate) < new Date();
    };

    const completedTasks = tasks.filter((task) => task.status === 'Completed').length;
    const overdueTasks = tasks.filter((task) => isOverdue(task.dueDate, task.status)).length;
    const inProgressTasks = tasks.filter((task) => task.status === 'In Progress').length;

    const summaryCards: SummaryCardItem[] = [
        { label: 'In Progress', value: inProgressTasks, icon: <ListTodo size={18} />, variant: 'info' },
        { label: 'Overdue', value: overdueTasks, icon: <TimerReset size={18} />, variant: 'danger' },
        { label: 'Completed', value: completedTasks, icon: <CheckCircle size={18} />, variant: 'success' },
    ];

    const columns: ModuleColumnDef<TaskRecord>[] = [
        {
            id: 'statusIcon',
            header: '',
            width: '48px',
            align: 'center',
            cell: (task) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleComplete(task._id, task.status);
                    }}
                    disabled={task.status === 'Completed'}
                    style={{ background: 'none', border: 'none', cursor: task.status === 'Completed' ? 'default' : 'pointer', padding: 0 }}
                >
                    {task.status === 'Completed' ? (
                        <CheckCircle size={20} style={{ color: 'var(--mod-success)' }} />
                    ) : (
                        <Circle size={20} style={{ color: 'var(--mod-border)' }} className="hover:text-blue-500 transition-colors" />
                    )}
                </button>
            )
        },
        {
            id: 'task',
            header: 'Task Details',
            width: '40%',
            cell: (task) => (
                <div style={{ minWidth: 0, opacity: task.status === 'Completed' ? 0.6 : 1 }}>
                    <div className="mod-table__primary-text" style={{ textDecoration: task.status === 'Completed' ? 'line-through' : 'none' }}>
                        {task.title}
                    </div>
                    {task.description && (
                         <div className="mod-table__secondary-text truncate mt-0.5">
                             {task.description}
                         </div>
                    )}
                </div>
            )
        },
        {
            id: 'dueDate',
            header: 'Due Date',
            width: '15%',
            cell: (task) => {
                const overdue = isOverdue(task.dueDate, task.status);
                return (
                    <div>
                        <div className="mod-table__primary-text flex items-center gap-1.5" style={{ fontSize: 13, color: overdue ? 'var(--mod-danger)' : 'var(--mod-text-secondary)' }}>
                            <Calendar size={13} />
                            {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                        {overdue && (
                             <div className="flex items-center gap-1 mt-1 text-xs font-semibold" style={{ color: 'var(--mod-danger)' }}>
                                 <AlertCircle size={12} /> Overdue
                             </div>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'priority',
            header: 'Priority',
            width: '12%',
            cell: (task) => {
                let variant: 'danger' | 'warning' | 'success' | 'neutral' = 'neutral';
                if (task.priority === 'High') variant = 'danger';
                else if (task.priority === 'Medium') variant = 'warning';
                else if (task.priority === 'Low') variant = 'success';
                
                return <ModuleBadge variant={variant}>{task.priority}</ModuleBadge>;
            }
        },
        {
            id: 'status',
            header: 'Status',
            width: '12%',
            cell: (task) => {
                let variant: 'success' | 'info' | 'neutral' | 'danger' = 'neutral';
                if (task.status === 'Completed') variant = 'success';
                else if (task.status === 'In Progress') variant = 'info';
                else if (task.status === 'Cancelled') variant = 'danger';

                return <ModuleBadge variant={variant}>{task.status}</ModuleBadge>;
            }
        },
        {
            id: 'actions',
            header: '',
            align: 'right',
            width: '80px',
            cell: (task) => (
                <ModuleRowActions
                    actions={[
                        {
                            label: 'Edit task',
                            icon: <Edit size={14} />,
                            onClick: () => handleEdit(task)
                        },
                        {
                            label: 'Mark complete',
                            icon: <CheckCircle size={14} />,
                            onClick: () => handleComplete(task._id, task.status),
                            divider: true
                        },
                        {
                            label: 'Delete',
                            icon: <Trash2 size={14} />,
                            onClick: () => setDeleteId(task._id),
                            danger: true
                        }
                    ]}
                />
            )
        }
    ];

    return (
        <ModulePageShell>
            <ModulePageHeader
                eyebrow="Workspace · Tasks"
                title="Tasks"
                description="Keep follow-ups, reminders, and ownership visible in one tighter daily operator workspace."
                actions={
                    <button
                        className="mod-btn mod-btn--primary"
                        onClick={() => {
                            setEditingTask(null);
                            setShowModal(true);
                        }}
                    >
                        <Plus size={14} /> New Task
                    </button>
                }
            />

            <ModuleSummaryCards cards={summaryCards} />

            <ModuleToolbar
                activeFilters={activeFilters}
                onClearAllFilters={clearFilters}
                totalCount={pagination.total}
                countLabel="tasks"
            >
                <select
                    className="mod-toolbar__select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">All status</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                </select>

                <select
                    className="mod-toolbar__select"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                >
                    <option value="">All priorities</option>
                    <option value="High">High priority</option>
                    <option value="Medium">Medium priority</option>
                    <option value="Low">Low priority</option>
                </select>
            </ModuleToolbar>

            {error && (
                <div style={{
                    padding: '12px 16px',
                    background: 'var(--mod-danger-light)',
                    border: '1px solid #fecaca',
                    borderRadius: 'var(--mod-radius-lg)',
                    color: 'var(--mod-danger-text)',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 16
                }}>
                    {error}
                </div>
            )}

            <div style={{ marginTop: '16px' }}>
                <ModuleDataTable
                    rows={tasks}
                    columns={columns}
                    rowKey={(task) => task._id}
                    loading={loading}
                    error={null}
                    tableTitle="To-Do List"
                    tableBadge={`${tasks.length} visible`}
                    emptyTitle="No tasks found"
                    emptyDescription="Create your first task to keep follow-ups and internal execution moving."
                    emptyIcon={<Inbox size={28} />}
                    emptyAction={
                        <button
                            className="mod-btn mod-btn--primary"
                            onClick={() => {
                                setEditingTask(null);
                                setShowModal(true);
                            }}
                        >
                            <Plus size={14} /> Create task
                        </button>
                    }
                    page={currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total}
                    onPageChange={setCurrentPage}
                    onRowClick={(task) => handleEdit(task)}
                />
            </div>

            <ConfirmDialog
                open={!!deleteId}
                title="Delete task"
                message="Are you sure you want to delete this task? This action cannot be undone."
                confirmLabel="Delete task"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteId(null)}
            />

            {showModal && (
                <TaskFormModal
                    task={editingTask || undefined}
                    onClose={handleCloseModal}
                />
            )}
        </ModulePageShell>
    );
};

export default TasksPage;

