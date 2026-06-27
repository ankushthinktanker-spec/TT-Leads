import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';

export interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
    status: 'Active' | 'Inactive';
    teamId?: {
        _id: string;
        name: string;
    };
    managerId?: {
        _id: string;
        firstName: string;
        lastName: string;
    };
    lastLogin?: string;
    createdAt: string;
}

type UserInput = Partial<User> & { password?: string };

interface UserState {
    users: User[];
    currentUser: User | null;
    loading: boolean;
    error: string | null;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

const initialState: UserState = {
    users: [],
    currentUser: null,
    loading: false,
    error: null,
    pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    }
};

// Async Thunks
export const fetchUsers = createAsyncThunk(
    'users/fetchUsers',
    async (params: { page?: number; limit?: number; search?: string; role?: string; status?: string }, { rejectWithValue }) => {
        try {
            const response = await api.get('/users', { params });
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch users'));
        }
    }
);

const fetchUserById = createAsyncThunk(
    'users/fetchUserById',
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await api.get(`/users/${id}`);
            return response.data.data.user;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch user'));
        }
    }
);

export const createUser = createAsyncThunk(
    'users/createUser',
    async (userData: UserInput, { rejectWithValue }) => {
        try {
            const response = await api.post('/auth/register', userData);
            const createdUser = response.data.data.user;
            if (createdUser?.id && !createdUser._id) {
                return { ...createdUser, _id: createdUser.id };
            }
            return createdUser;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to create user'));
        }
    }
);

export const updateUser = createAsyncThunk(
    'users/updateUser',
    async ({ id, data }: { id: string; data: UserInput }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/users/${id}`, data);
            return response.data.data.user;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update user'));
        }
    }
);

export const deleteUser = createAsyncThunk(
    'users/deleteUser',
    async (id: string, { rejectWithValue }) => {
        try {
            await api.delete(`/users/${id}`);
            return id;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to delete user'));
        }
    }
);

const userSlice = createSlice({
    name: 'users',
    initialState,
    reducers: {
    },
    extraReducers: (builder) => {
        // Fetch Users
        builder
            .addCase(fetchUsers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUsers.fulfilled, (state, action) => {
                state.loading = false;
                const data = action.payload?.data || {};
                const meta = data.meta || {};
                state.users = data.data || [];
                state.pagination = {
                    page: meta.page || 1,
                    limit: meta.limit || 10,
                    total: meta.total || 0,
                    totalPages: meta.totalPages || 0
                };
            })
            .addCase(fetchUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Fetch User By Id
        builder
            .addCase(fetchUserById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUserById.fulfilled, (state, action) => {
                state.loading = false;
                state.currentUser = action.payload;
            })
            .addCase(fetchUserById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Create User
        builder
            .addCase(createUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createUser.fulfilled, (state, action) => {
                state.loading = false;
                state.users.unshift(action.payload);
            })
            .addCase(createUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Update User
        builder
            .addCase(updateUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateUser.fulfilled, (state, action) => {
                state.loading = false;
                state.users = state.users.map(user =>
                    user._id === action.payload._id ? action.payload : user
                );
                if (state.currentUser?._id === action.payload._id) {
                    state.currentUser = action.payload;
                }
            })
            .addCase(updateUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Delete User
        builder
            .addCase(deleteUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteUser.fulfilled, (state, action) => {
                state.loading = false;
                state.users = state.users.filter(user => user._id !== action.payload);
            })
            .addCase(deleteUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    }
});

export default userSlice.reducer;
