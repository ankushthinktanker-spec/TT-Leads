import { createSlice, createAsyncThunk, ActionReducerMapBuilder, Draft } from '@reduxjs/toolkit';
import api from '../api/axios';
import { getErrorMessage } from '../utils/error';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface CrudState<T> {
    items: T[];
    currentItem: T | null;
    loading: boolean;
    error: string | null;
    pagination: PaginationMeta;
}

export interface CrudSliceConfig<T> {
    /** Redux slice name, e.g. 'companies' */
    name: string;
    /** API base path, e.g. '/companies' */
    endpoint: string;
    /**
     * Key used by the backend when returning a single entity.
     * E.g. 'company' if the API returns `{ data: { company: {...} } }`.
     * When omitted the factory tries `data.data` as a fallback.
     */
    entityKey?: string;
    /** Override parts of the default initial state */
    initialState?: Partial<CrudState<T>>;
    /**
     * Hook to add extra reducers (custom thunks, etc.) on top of the
     * standard CRUD cases the factory already registers.
     */
    extraReducers?: (builder: ActionReducerMapBuilder<CrudState<T>>) => void;
}

type ApiListPayload<T> = {
    data?: {
        data?: T[];
        meta?: Partial<PaginationMeta>;
        [key: string]: unknown;
    };
};

type ApiEntityPayload<T> = {
    data?: {
        data?: T;
        [key: string]: unknown;
    };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safely extract the entity from a single-item API response. */
function extractEntity<T>(payload: ApiEntityPayload<T>, entityKey?: string): T | null {
    const inner = payload?.data;
    if (!inner) return null;
    if (entityKey && inner[entityKey] !== undefined) return inner[entityKey] as T;
    // Fallback: if there is a nested `data` key, use it
    if (inner.data !== undefined) return inner.data;
    return inner as unknown as T;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCrudSlice<T extends { _id: string }>(config: CrudSliceConfig<T>) {
    const { name, endpoint, entityKey } = config;

    const initialState: CrudState<T> = {
        items: [],
        currentItem: null,
        loading: false,
        error: null,
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        ...config.initialState,
    };

    // ------------------------------------------------------------------
    // Async thunks
    // ------------------------------------------------------------------

    const fetchList = createAsyncThunk(
        `${name}/fetchList`,
        async (params: Record<string, string | number | boolean | undefined> = {}, { rejectWithValue }) => {
            try {
                const response = await api.get(endpoint, { params });
                return response.data as ApiListPayload<T>;
            } catch (err: unknown) {
                return rejectWithValue(getErrorMessage(err, `Failed to fetch ${name}`));
            }
        }
    );

    const fetchById = createAsyncThunk(
        `${name}/fetchById`,
        async (id: string, { rejectWithValue }) => {
            try {
                const response = await api.get(`${endpoint}/${id}`);
                return response.data as ApiEntityPayload<T>;
            } catch (err: unknown) {
                return rejectWithValue(getErrorMessage(err, `Failed to fetch ${name} item`));
            }
        }
    );

    const create = createAsyncThunk(
        `${name}/create`,
        async (data: Partial<T>, { rejectWithValue }) => {
            try {
                const response = await api.post(endpoint, data);
                return response.data as ApiEntityPayload<T>;
            } catch (err: unknown) {
                return rejectWithValue(getErrorMessage(err, `Failed to create ${name}`));
            }
        }
    );

    const update = createAsyncThunk(
        `${name}/update`,
        async ({ id, data }: { id: string; data: Partial<T> }, { rejectWithValue }) => {
            try {
                const response = await api.put(`${endpoint}/${id}`, data);
                return response.data as ApiEntityPayload<T>;
            } catch (err: unknown) {
                return rejectWithValue(getErrorMessage(err, `Failed to update ${name}`));
            }
        }
    );

    const remove = createAsyncThunk(
        `${name}/remove`,
        async (id: string, { rejectWithValue }) => {
            try {
                await api.delete(`${endpoint}/${id}`);
                return id;
            } catch (err: unknown) {
                return rejectWithValue(getErrorMessage(err, `Failed to delete ${name}`));
            }
        }
    );

    // ------------------------------------------------------------------
    // Slice
    // ------------------------------------------------------------------

    const slice = createSlice({
        name,
        initialState,
        reducers: {
            clearError: (state) => {
                state.error = null;
            },
            clearCurrentItem: (state) => {
                state.currentItem = null;
            },
        },
        extraReducers: (builder) => {
            // --- fetchList ---
            builder
                .addCase(fetchList.pending, (state) => {
                    state.loading = true;
                    state.error = null;
                })
                .addCase(fetchList.fulfilled, (state, action) => {
                    state.loading = false;
                    const data = action.payload?.data || {};
                    const meta = data.meta || {};
                    state.items = (data.data || []) as Draft<T>[];
                    state.pagination = {
                        page: meta.page ?? 1,
                        limit: meta.limit ?? 10,
                        total: meta.total ?? 0,
                        totalPages: meta.totalPages ?? 0,
                    };
                })
                .addCase(fetchList.rejected, (state, action) => {
                    state.loading = false;
                    state.error =
                        (action.payload as string) ||
                        action.error.message ||
                        `Failed to fetch ${name}`;
                });

            // --- fetchById ---
            builder
                .addCase(fetchById.pending, (state) => {
                    state.loading = true;
                    state.error = null;
                })
                .addCase(fetchById.fulfilled, (state, action) => {
                    state.loading = false;
                    state.currentItem = extractEntity<T>(action.payload, entityKey) as Draft<T> | null;
                })
                .addCase(fetchById.rejected, (state, action) => {
                    state.loading = false;
                    state.error =
                        (action.payload as string) ||
                        action.error.message ||
                        `Failed to fetch ${name} item`;
                });

            // --- create ---
            builder
                .addCase(create.pending, (state) => {
                    state.loading = true;
                    state.error = null;
                })
                .addCase(create.fulfilled, (state, action) => {
                    state.loading = false;
                    const newItem = extractEntity<T>(action.payload, entityKey);
                    if (newItem) state.items.unshift(newItem as Draft<T>);
                })
                .addCase(create.rejected, (state, action) => {
                    state.loading = false;
                    state.error =
                        (action.payload as string) ||
                        action.error.message ||
                        `Failed to create ${name}`;
                });

            // --- update ---
            builder
                .addCase(update.pending, (state) => {
                    state.loading = true;
                    state.error = null;
                })
                .addCase(update.fulfilled, (state, action) => {
                    state.loading = false;
                    const updated = extractEntity<T>(action.payload, entityKey) as Draft<T> | null;
                    if (updated) {
                        const idx = state.items.findIndex((item) => item._id === updated._id);
                        if (idx !== -1) state.items[idx] = updated;
                        if (state.currentItem && state.currentItem._id === updated._id) {
                            state.currentItem = updated;
                        }
                    }
                })
                .addCase(update.rejected, (state, action) => {
                    state.loading = false;
                    state.error =
                        (action.payload as string) ||
                        action.error.message ||
                        `Failed to update ${name}`;
                });

            // --- remove ---
            builder
                .addCase(remove.pending, (state) => {
                    state.loading = true;
                    state.error = null;
                })
                .addCase(remove.fulfilled, (state, action) => {
                    state.loading = false;
                    const id = action.payload as string;
                    state.items = state.items.filter((item) => item._id !== id);
                    if (state.currentItem && state.currentItem._id === id) {
                        state.currentItem = null;
                    }
                })
                .addCase(remove.rejected, (state, action) => {
                    state.loading = false;
                    state.error =
                        (action.payload as string) ||
                        action.error.message ||
                        `Failed to delete ${name}`;
                });

            // --- caller-supplied extra reducers ---
            if (config.extraReducers) {
                config.extraReducers(builder);
            }
        },
    });

    return {
        slice,
        reducer: slice.reducer,
        actions: {
            ...slice.actions,
            fetchList,
            fetchById,
            create,
            update,
            remove,
        },
    };
}
