import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createTask, updateTask } from '../../store/slices/taskSlice';
import Modal from '../ui/Modal';

interface TaskFormModalProps {
    task?: {
        _id: string;
        title?: string;
        description?: string;
        dueDate?: string;
        priority?: 'High' | 'Medium' | 'Low';
        status?: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
    };
    onClose: () => void;
}

const TaskFormModal = ({ task, onClose }: TaskFormModalProps) => {
    const dispatch = useAppDispatch();
    const { loading } = useAppSelector((state) => state.tasks);
    const { user } = useAppSelector((state) => state.auth);

    const [formData, setFormData] = useState({
        title: task?.title || '',
        description: task?.description || '',
        dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
        priority: task?.priority || 'Medium',
        status: task?.status || 'Pending',
    });
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const payload = {
            ...formData,
            assignedTo: user?.id || 'current-user',
        };

        try {
            if (task) {
                await dispatch(updateTask({ id: task._id, data: payload })).unwrap();
            } else {
                await dispatch(createTask(payload)).unwrap();
            }
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to save task');
        }
    };

    return (
        <Modal
            title={task ? 'Edit Task' : 'Create Task'}
            onClose={onClose}
            className="max-w-2xl"
            footer={(
                <div className="flex gap-3 w-full">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="flex-1 rounded-xl border border-slate-200 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition-all hover:bg-slate-50 font-inter"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        form="task-form" 
                        disabled={loading} 
                        className="flex-1 rounded-xl bg-slate-900 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-xl shadow-slate-900/10 transition-all hover:bg-sky-600 disabled:opacity-50 font-inter"
                    >
                        {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
                    </button>
                </div>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-5" id="task-form">
                {error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 tt-animate-shake">
                        {error}
                    </div>
                )}
                
                <div className="flex items-center gap-4 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600">
                        {user?.firstName?.[0] || 'U'}
                    </div>
                    <div>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700">Assigned To</p>
                            <span className="rounded-full border border-sky-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                                Execution owner
                            </span>
                        </div>
                        <p className="text-sm font-semibold leading-none text-slate-900">
                            {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email || 'System Strategist'}
                        </p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="ml-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Task title <span className="text-rose-500">*</span></label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                        placeholder="e.g., Call lead after proposal review"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="ml-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all h-28 resize-none placeholder:text-slate-300"
                        placeholder="Add context for the follow-up or internal task."
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-1.5">
                        <label className="ml-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Due date <span className="text-rose-500">*</span></label>
                        <input
                            type="date"
                            name="dueDate"
                            value={formData.dueDate}
                            onChange={handleChange}
                            required
                            className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="ml-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Priority</label>
                        <select
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                            className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="ml-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Status</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default TaskFormModal;

