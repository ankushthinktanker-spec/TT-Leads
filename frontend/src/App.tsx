import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppSelector } from './hooks/redux';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { LeadsPage } from './pages/leads/LeadsPage';
import { AddLeadPage } from './pages/leads/AddLeadPage';
import { EditLeadPage } from './pages/leads/EditLeadPage';
import { LeadDetailsPage } from './pages/leads/LeadDetailsPage';
import CompaniesPage from './pages/companies/CompaniesPage';
import CompanyForm from './components/companies/CompanyForm';
import CompanyDetailsPage from './pages/companies/CompanyDetailsPage';
import ContactsPage from './pages/contacts/ContactsPage';
import ProposalsPage from './pages/proposals/ProposalsPage';
import ProposalForm from './pages/proposals/ProposalForm';
import ProposalDetailsPage from './pages/proposals/ProposalDetailsPage';
import ProposalPreviewPage from './pages/proposals/ProposalPreviewPage';
import TasksPage from './pages/tasks/TasksPage';
import UsersPage from './pages/users/UsersPage';
import SettingsPage from './pages/settings/SettingsPage';
import ReportsPage from './pages/reports/ReportsPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import ToastContainer from './components/ui/ToastContainer';
import NotAuthorizedPage from './pages/NotAuthorizedPage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const RoleRoute = ({
    children,
    allowedRoles
}: {
    children: React.ReactNode;
    allowedRoles: string[];
}) => {
    const { isAuthenticated, user } = useAppSelector((state) => state.auth);
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!user || !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }
    return <>{children}</>;
};

const AuthWatcher = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    useEffect(() => {
        const handler = () => {
            navigate('/login', { replace: true });
        };
        window.addEventListener('auth:unauthorized', handler);
        return () => window.removeEventListener('auth:unauthorized', handler);
    }, [navigate]);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    return null;
};

function App() {
    return (
        <Router>
            <AuthWatcher />
            <ToastContainer />
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/unauthorized" element={
                    <ProtectedRoute>
                        <NotAuthorizedPage />
                    </ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                } />
                <Route path="/leads" element={
                    <ProtectedRoute>
                        <LeadsPage />
                    </ProtectedRoute>
                } />
                <Route path="/leads/new" element={
                    <ProtectedRoute>
                        <AddLeadPage />
                    </ProtectedRoute>
                } />
                <Route path="/leads/:id/edit" element={
                    <ProtectedRoute>
                        <EditLeadPage />
                    </ProtectedRoute>
                } />
                <Route path="/leads/:id" element={
                    <ProtectedRoute>
                        <LeadDetailsPage />
                    </ProtectedRoute>
                } />
                <Route path="/companies" element={
                    <ProtectedRoute>
                        <CompaniesPage />
                    </ProtectedRoute>
                } />
                <Route path="/companies/new" element={
                    <ProtectedRoute>
                        <CompanyForm />
                    </ProtectedRoute>
                } />
                <Route path="/companies/:id/edit" element={
                    <ProtectedRoute>
                        <CompanyForm />
                    </ProtectedRoute>
                } />
                <Route path="/companies/:id" element={
                    <ProtectedRoute>
                        <CompanyDetailsPage />
                    </ProtectedRoute>
                } />
                <Route path="/contacts" element={
                    <ProtectedRoute>
                        <ContactsPage />
                    </ProtectedRoute>
                } />
                <Route path="/proposals" element={
                    <ProtectedRoute>
                        <ProposalsPage />
                    </ProtectedRoute>
                } />
                <Route path="/proposals/new" element={
                    <ProtectedRoute>
                        <ProposalForm />
                    </ProtectedRoute>
                } />
                <Route path="/proposals/:id" element={
                    <ProtectedRoute>
                        <ProposalDetailsPage />
                    </ProtectedRoute>
                } />
                <Route path="/proposals/:id/edit" element={
                    <ProtectedRoute>
                        <ProposalForm />
                    </ProtectedRoute>
                } />
                <Route path="/proposals/:id/preview" element={
                    <ProtectedRoute>
                        <ProposalPreviewPage />
                    </ProtectedRoute>
                } />
                <Route path="/tasks" element={
                    <ProtectedRoute>
                        <TasksPage />
                    </ProtectedRoute>
                } />
                <Route path="/users" element={
                    <RoleRoute allowedRoles={['Admin']}>
                        <UsersPage />
                    </RoleRoute>
                } />
                <Route path="/settings" element={
                    <ProtectedRoute>
                        <SettingsPage />
                    </ProtectedRoute>
                } />
                <Route path="/reports" element={
                    <ProtectedRoute>
                        <ReportsPage />
                    </ProtectedRoute>
                } />
                <Route path="/analytics" element={
                    <ProtectedRoute>
                        <AnalyticsPage />
                    </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
