import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchTasks, deleteTask, completeTask } from '../../store/slices/taskSlice';
import MainLayout from '../../components/layout/MainLayout';
import TaskFormModal from '../../components/tasks/TaskFormModal';
import { Plus, CheckCircle, Circle, Edit, Trash2, Calendar, AlertCircle } from 'lucide-react';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import EmptyState from '../../components/ui/EmptyState';

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
    const { tasks, loading, pagination } = useAppSelector((state) => state.tasks);

    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        dispatch(fetchTasks({
            page: currentPage,
            limit: 20,
            status: statusFilter,
            priority: priorityFilter
        }));
    }, [dispatch, currentPage, statusFilter, priorityFilter]);

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            await dispatch(deleteTask(id));
            dispatch(fetchTasks({ page: currentPage }));
        }
    };

    const handleComplete = async (id: string) => {
        await dispatch(completeTask(id));
        dispatch(fetchTasks({ page: currentPage }));
    };

    const handleEdit = (task: TaskRecord) => {
        setEditingTask(task);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingTask(null);
        dispatch(fetchTasks({ page: currentPage }));
    };

    const activeFilters = useMemo(() => {
        const filters: string[] = [];
        if (statusFilter) filters.push(`Status: ${statusFilter}`);
        if (priorityFilter) filters.push(`Priority: ${priorityFilter}`);
        return filters;
    }, [statusFilter, priorityFilter]);

    const hasActiveFilters = activeFilters.length > 0;

    const handleClearFilters = () => {
        setStatusFilter('');
        setPriorityFilter('');
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'High': return 'status-danger';
            case 'Medium': return 'status-warning';
            case 'Low': return 'status-success';
            default: return 'status-neutral';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return 'status-success';
            case 'In Progress': return 'bg-brand-500/15 text-brand-300';
            case 'Pending': return 'status-neutral';
            case 'Cancelled': return 'status-danger';
            default: return 'status-neutral';
        }
    };

    const isOverdue = (dueDate: string, status: string) => {
        if (status === 'Completed' || status === 'Cancelled') return false;
        return new Date(dueDate) < new Date();
    };

    return (
        <MainLayout>
            <PageLayout>
                <PageHeader
                    title="Tasks & Reminders"
                    subtitle="Manage your tasks and follow-ups"
                    actions={(
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn btn-primary"
                        >
                            <Plus size={20} />
                            New Task
                        </button>
                    )}
                />

                <FilterBar className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input"
                        >
                            <option value="">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>

                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="input"
                        >
                            <option value="">All Priorities</option>
                            <option value="High">High Priority</option>
                            <option value="Medium">Medium Priority</option>
                            <option value="Low">Low Priority</option>
                        </select>

                        <div className="text-sm text-secondary-400 flex items-center justify-end">
                            Total: {pagination.total} tasks
                        </div>
                    </div>
                </FilterBar>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {activeFilters.map((filter) => (
                        <span key={filter} className="filter-chip">
                            {filter}
                        </span>
                    ))}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="ml-auto text-xs text-primary-400 font-semibold uppercase tracking-widest hover:text-primary-300"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                <SurfaceCard className="mt-6 overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
                        </div>
                    ) : tasks.length === 0 ? (
                        <EmptyState
                            icon={<CheckCircle size={48} />}
                            title="No tasks found"
                            description="Create your first task to get started."
                            action={(
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="btn btn-outline"
                                >
                                    Create task
                                </button>
                            )}
                        />
                    ) : (
                        <div className="divide-y divide-white/5">
                            {tasks.map((task) => (
                                <div
                                    key={task._id}
                                    className={`group p-4 transition-colors ${isOverdue(task.dueDate, task.status) ? 'bg-red-500/10' : 'hover:bg-secondary-900/60'}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <button
                                            onClick={() => task.status !== 'Completed' && handleComplete(task._id)}
                                            className="mt-1"
                                            disabled={task.status === 'Completed'}
                                        >
                                            {task.status === 'Completed' ? (
                                                <CheckCircle className="text-emerald-400" size={24} />
                                            ) : (
                                                <Circle className="text-secondary-500 hover:text-brand-400" size={24} />
                                            )}
                                        </button>

                                        <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className={`text-lg font-semibold ${task.status === 'Completed' ? 'line-through text-secondary-500' : 'text-secondary-50'}`}>
                                                        {task.title}
                                                    </h3>
                                                    {task.description && (
                                                        <p className="text-sm text-secondary-400 mt-1">{task.description}</p>
                                                    )}
                                                    <div className="flex flex-wrap items-center gap-3 mt-3">
                                                        <span className={`status-pill ${getPriorityColor(task.priority)}`}>
                                                            {task.priority}
                                                        </span>
                                                        <span className={`status-pill ${getStatusColor(task.status)}`}>
                                                            {task.status}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-sm text-secondary-400">
                                                            <Calendar size={14} />
                                                            {new Date(task.dueDate).toLocaleDateString()}
                                                        </span>
                                                        {isOverdue(task.dueDate, task.status) && (
                                                            <span className="flex items-center gap-1 text-sm text-red-300 font-medium">
                                                                <AlertCircle size={14} />
                                                                Overdue
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 ml-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(task)}
                                                        className="icon-button"
                                                        title="Edit"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(task._id)}
                                                        className="icon-button text-red-400 hover:text-red-300"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {pagination.pages > 1 && (
                        <div className="px-4 py-3 flex items-center justify-between border-t border-white/5">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="btn btn-outline py-1.5 px-3 text-xs"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                                    disabled={currentPage === pagination.pages}
                                    className="btn btn-outline py-1.5 px-3 text-xs"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-secondary-400">
                                        Page <span className="font-medium text-secondary-100">{currentPage}</span> of{' '}
                                        <span className="font-medium text-secondary-100">{pagination.pages}</span>
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="btn btn-outline py-1.5 px-3 text-xs"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                                        disabled={currentPage === pagination.pages}
                                        className="btn btn-outline py-1.5 px-3 text-xs"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </SurfaceCard>

                {showModal && (
                    <TaskFormModal
                        task={editingTask}
                        onClose={handleCloseModal}
                    />
                )}
            </PageLayout>
        </MainLayout>
    );
};

export default TasksPage;
