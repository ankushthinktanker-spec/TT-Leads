import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import leadReducer from './slices/leadSlice';
import companyReducer from './slices/companySlice';
import contactReducer from './slices/contactSlice';
import proposalReducer from './slices/proposalSlice';
import taskReducer from './slices/taskSlice';
import userReducer from './slices/userSlice';
import settingsReducer from './slices/settingsSlice';
import analyticsReducer from './slices/analyticsSlice';
import reportsReducer from './slices/reportsSlice';
import dealReducer from './slices/dealSlice';
import pipelineReducer from './slices/pipelineSlice';
import contractReducer from './slices/contractSlice';
import invoiceReducer from './slices/invoiceSlice';
import subscriptionReducer from './slices/subscriptionSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        leads: leadReducer,
        companies: companyReducer,
        contacts: contactReducer,
        proposals: proposalReducer,
        tasks: taskReducer,
        users: userReducer,
        settings: settingsReducer,
        analytics: analyticsReducer,
        reports: reportsReducer,
        deals: dealReducer,
        pipelines: pipelineReducer,
        contracts: contractReducer,
        invoices: invoiceReducer,
        subscriptions: subscriptionReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
