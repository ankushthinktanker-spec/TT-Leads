import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../api/axios';

interface Task {
    _id: string;
    title: string;
    description?: string;
    relatedTo?: 'Lead' | 'Company' | 'Proposal';
    relatedId?: string;
    assignedTo: string;
    dueDate: string;
    priority: 'High' | 'Medium' | 'Low';
    status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
}

interface TaskState {
    tasks: Task[];
    currentTask: Task | null;
    loading: boolean;
    error: string | null;
    pagination: {
        total: number;
        page: number;
        pages: number;
        limit: number;
    };
}

interface TaskApiResponse<T> {
    data: T;
}

interface TaskListPayload {
    tasks?: Task[];
    pagination: {
        total?: number;
        page?: number;
        pages?: number;
        limit?: number;
    };
}

interface TaskItemPayload {
    task: Task;
}

const initialState: TaskState = {
    tasks: [],
    currentTask: null,
    loading: false,
    error: null,
    pagination: {
        total: 0,
        page: 1,
        pages: 1,
        limit: 10,
    },
};

type RelatedRef = { model?: Task['relatedTo']; id?: string };
type TaskApi = Task & { relatedTo?: RelatedRef };

const normalizeTask = (task: TaskApi): Task => ({
    ...task,
    relatedTo: task.relatedTo?.model || task.relatedTo,
    relatedId: task.relatedTo?.id || task.relatedId
});

// Async thunks
export const fetchTasks = createAsyncThunk(
    'tasks/fetchAll',
    async (params: {
        page?: number;
        limit?: number;
        status?: string;
        priority?: string;
        relatedTo?: string;
        relatedId?: string;
    } = {}) => {
        const response = await api.get('/tasks', {
            params: {
                page: params.page,
                limit: params.limit,
                status: params.status,
                priority: params.priority,
                taskType: params.relatedTo,
                relatedId: params.relatedId
            }
        });
        return response.data;
    }
);

const fetchTaskById = createAsyncThunk(
    'tasks/fetchById',
    async (id: string) => {
        const response = await api.get(`/tasks/${id}`);
        return response.data;
    }
);

export const createTask = createAsyncThunk(
    'tasks/create',
    async (data: Partial<Task>) => {
        const response = await api.post('/tasks', data);
        return response.data;
    }
);

export const updateTask = createAsyncThunk(
    'tasks/update',
    async ({ id, data }: { id: string; data: Partial<Task> }) => {
        const response = await api.put(`/tasks/${id}`, data);
        return response.data;
    }
);

export const deleteTask = createAsyncThunk(
    'tasks/delete',
    async (id: string) => {
        await api.delete(`/tasks/${id}`);
        return id;
    }
);

export const completeTask = createAsyncThunk(
    'tasks/complete',
    async (id: string) => {
        const response = await api.patch(`/tasks/${id}/complete`);
        return response.data;
    }
);

const taskSlice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {
    },
    extraReducers: (builder) => {
        builder
            // Fetch all tasks
            .addCase(fetchTasks.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTasks.fulfilled, (state, action: PayloadAction<TaskApiResponse<TaskListPayload>>) => {
                state.loading = false;
                const data = (action.payload?.data || {}) as TaskListPayload & {
                    items?: TaskApi[];
                    meta?: TaskListPayload['pagination'];
                };
                const pagination = data.pagination || data.meta || {};
                const items = data.tasks || data.items || [];
                state.tasks = items.map(normalizeTask);
                state.pagination = {
                    total: pagination.total || 0,
                    page: pagination.page || 1,
                    pages: pagination.pages || 1,
                    limit: pagination.limit || 10,
                };
            })
            .addCase(fetchTasks.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch tasks';
            })
            // Fetch task by ID
            .addCase(fetchTaskById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTaskById.fulfilled, (state, action: PayloadAction<TaskApiResponse<TaskItemPayload>>) => {
                state.loading = false;
                state.currentTask = normalizeTask(action.payload.data.task);
            })
            .addCase(fetchTaskById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch task';
            })
            // Create task
            .addCase(createTask.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createTask.fulfilled, (state, action: PayloadAction<TaskApiResponse<TaskItemPayload>>) => {
                state.loading = false;
                state.tasks.unshift(normalizeTask(action.payload.data.task));
            })
            .addCase(createTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to create task';
            })
            // Update task
            .addCase(updateTask.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateTask.fulfilled, (state, action: PayloadAction<TaskApiResponse<TaskItemPayload>>) => {
                state.loading = false;
                const updatedTask = normalizeTask(action.payload.data.task);
                const index = state.tasks.findIndex(t => t._id === updatedTask._id);
                if (index !== -1) {
                    state.tasks[index] = updatedTask;
                }
                if (state.currentTask?._id === updatedTask._id) {
                    state.currentTask = updatedTask;
                }
            })
            .addCase(updateTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to update task';
            })
            // Delete task
            .addCase(deleteTask.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteTask.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.tasks = state.tasks.filter(t => t._id !== action.payload);
            })
            .addCase(deleteTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to delete task';
            })
            // Complete task
            .addCase(completeTask.fulfilled, (state, action: PayloadAction<TaskApiResponse<TaskItemPayload>>) => {
                const updatedTask = normalizeTask(action.payload.data.task);
                const index = state.tasks.findIndex(t => t._id === updatedTask._id);
                if (index !== -1) {
                    state.tasks[index] = updatedTask;
                }
                if (state.currentTask?._id === updatedTask._id) {
                    state.currentTask = updatedTask;
                }
            });
    },
});

export default taskSlice.reducer;
