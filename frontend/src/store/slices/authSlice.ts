import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from '../../api/axios';
import { getErrorMessage } from '../../utils/error';
import { getAccessToken, getStoredUser, setTokens, setStoredUser, clearAuthStorage, isTokenExpired } from '../../utils/authStorage';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    phone?: string;
    avatar?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: getStoredUser(),
    token: getAccessToken(),
    refreshToken: null,
    isAuthenticated: !!getAccessToken() && !isTokenExpired(getAccessToken()),
    loading: false,
    error: null,
};

// Async thunks
export const login = createAsyncThunk(
    'auth/login',
    async (credentials: { email: string; password: string; remember?: boolean }, { rejectWithValue }) => {
        try {
            const { remember = true, ...payload } = credentials;
            const response = await axios.post('/auth/login', payload);
            const { user, token, refreshToken } = response.data.data;

            setStoredUser(user, remember);
            setTokens(token, refreshToken, remember);

            return { user, token, refreshToken };
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Login failed'));
        }
    }
);

interface AuthResponsePayload {
    user: User;
    token: string;
    refreshToken: string;
}

const register = createAsyncThunk(
    'auth/register',
    async (userData: Record<string, unknown>, { rejectWithValue }) => {
        try {
            const response = await axios.post('/auth/register', userData);
            const { user, token, refreshToken } = response.data.data;

            setStoredUser(user, true);
            setTokens(token, refreshToken, true);

            return { user, token, refreshToken };
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Registration failed'));
        }
    }
);

const getMe = createAsyncThunk(
    'auth/getMe',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get('/auth/me');
            return response.data.data.user;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch user'));
        }
    }
);

export const updateProfile = createAsyncThunk(
    'auth/updateProfile',
    async (userData: Record<string, unknown>, { rejectWithValue }) => {
        try {
            const response = await axios.put('/auth/profile', userData);
            const user = response.data.data.user;
            setStoredUser(user, true);
            return user;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Update failed'));
        }
    }
);

export const logout = createAsyncThunk('auth/logout', async () => {
    try {
        await axios.post('/auth/logout');
    } catch (error) {
        // Ignore errors on logout
    } finally {
        clearAuthStorage();
    }
});

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Login
        builder
            .addCase(login.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action: PayloadAction<AuthResponsePayload>) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.refreshToken = action.payload.refreshToken;
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Register
        builder
            .addCase(register.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(register.fulfilled, (state, action: PayloadAction<AuthResponsePayload>) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.refreshToken = action.payload.refreshToken;
            })
            .addCase(register.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Get Me
        builder
            .addCase(getMe.pending, (state) => {
                state.loading = true;
            })
            .addCase(getMe.fulfilled, (state, action: PayloadAction<User>) => {
                state.loading = false;
                state.user = action.payload;
                localStorage.setItem('user', JSON.stringify(action.payload));
            })
            .addCase(getMe.rejected, (state) => {
                state.loading = false;
                state.isAuthenticated = false;
                state.user = null;
                state.token = null;
                state.refreshToken = null;
            });

        // Update Profile
        builder
            .addCase(updateProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateProfile.fulfilled, (state, action: PayloadAction<User>) => {
                state.loading = false;
                state.user = action.payload;
            })
            .addCase(updateProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Logout
        builder.addCase(logout.fulfilled, (state) => {
            state.user = null;
            state.token = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
            state.loading = false;
            state.error = null;
        });
    },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
