import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createTask, updateTask } from '../../store/slices/taskSlice';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FormLabel, TextInput, SelectInput, TextareaInput } from '../ui/Form';

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
            title={task ? 'Edit Task' : 'Create New Task'}
            onClose={onClose}
            footer={(
                <>
                    <Button type="button" onClick={onClose} variant="outline">
                        Cancel
                    </Button>
                    <Button type="submit" form="task-form" disabled={loading} variant="primary">
                        {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
                    </Button>
                </>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-4" id="task-form">
                {error && (
                    <div className="alert-error">
                        {error}
                    </div>
                )}
                <div className="rounded-lg border border-white/10 bg-secondary-900/60 px-4 py-3 text-xs text-secondary-400">
                    Assigned to <span className="text-secondary-100 font-semibold">{user?.name || user?.email || 'Current user'}</span>
                </div>
                <div>
                    <FormLabel>
                        Task Title <span className="text-red-500">*</span>
                    </FormLabel>
                    <TextInput
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        placeholder="e.g., Follow up with client"
                    />
                </div>

                <div>
                    <FormLabel>Description</FormLabel>
                    <TextareaInput
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Additional details about this task..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <FormLabel>
                            Due Date <span className="text-red-500">*</span>
                        </FormLabel>
                        <TextInput
                            type="date"
                            name="dueDate"
                            value={formData.dueDate}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <FormLabel>Priority</FormLabel>
                        <SelectInput
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                        >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </SelectInput>
                    </div>

                    <div>
                        <FormLabel>Status</FormLabel>
                        <SelectInput
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                        >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </SelectInput>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default TaskFormModal;
