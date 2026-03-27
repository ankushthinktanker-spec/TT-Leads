import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAppSelector } from './hooks/redux';
import ToastContainer from './components/ui/ToastContainer';
import { ROUTES } from './routes';

const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ContactAdminPage = lazy(() => import('./pages/auth/ContactAdminPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const LeadsPage = lazy(() => import('./pages/leads/LeadsPage').then((m) => ({ default: m.LeadsPage })));
const AddLeadPage = lazy(() => import('./pages/leads/AddLeadPage').then((m) => ({ default: m.AddLeadPage })));
const EditLeadPage = lazy(() => import('./pages/leads/EditLeadPage').then((m) => ({ default: m.EditLeadPage })));
const LeadDetailsPage = lazy(() => import('./pages/leads/LeadDetailsPage').then((m) => ({ default: m.LeadDetailsPage })));
const CompaniesPage = lazy(() => import('./pages/companies/CompaniesPage'));
const CompanyForm = lazy(() => import('./components/companies/CompanyForm'));
const CompanyDetailsPage = lazy(() => import('./pages/companies/CompanyDetailsPage'));
const ContactsPage = lazy(() => import('./pages/contacts/ContactsPage'));
const ProposalsPage = lazy(() => import('./pages/proposals/ProposalsPage').then((m) => ({ default: m.ProposalsPage })));
const ProposalForm = lazy(() => import('./pages/proposals/ProposalForm'));
const ProposalDetailsPage = lazy(() => import('./pages/proposals/ProposalDetailsPage'));
const ProposalPreviewPage = lazy(() => import('./pages/proposals/ProposalPreviewPage'));
const TasksPage = lazy(() => import('./pages/tasks/TasksPage'));
const UsersPage = lazy(() => import('./pages/users/UsersPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const AnalyticsPage = lazy(() => import('./pages/analytics/AnalyticsPage'));
const SubscriptionsPage = lazy(() => import('./pages/subscriptions/SubscriptionsPage'));
const InvoicesPage = lazy(() => import('./pages/invoices/InvoicesPage'));
const NotAuthorizedPage = lazy(() => import('./pages/NotAuthorizedPage'));
const MainLayout = lazy(() => import('./components/layout/MainLayout'));

const RouteFallback = () => (
    <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Loading...
    </div>
);

const PUBLIC_ROUTES: string[] = [ROUTES.login, ROUTES.forgotPassword, ROUTES.contactAdmin];

const ProtectedRoute = () => {
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    return isAuthenticated ? <Outlet /> : <Navigate to={ROUTES.login} replace />;
};

const RoleRoute = ({ children, allowedRoles }: { children: ReactNode; allowedRoles: string[] }) => {
    const { user } = useAppSelector((state) => state.auth);
    if (!user || !allowedRoles.includes(user.role)) {
        return <Navigate to={ROUTES.unauthorized} replace />;
    }
    return <>{children}</>;
};

const AuthWatcher = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);

    useEffect(() => {
        const handler = () => {
            navigate(ROUTES.login, { replace: true });
        };
        window.addEventListener('auth:unauthorized', handler);
        return () => window.removeEventListener('auth:unauthorized', handler);
    }, [navigate]);

    useEffect(() => {
        if (!isAuthenticated && !isPublicRoute) {
            navigate(ROUTES.login, { replace: true });
        }
    }, [isAuthenticated, isPublicRoute, navigate]);

    return null;
};

function App() {
    return (
        <>
            <AuthWatcher />
            <ToastContainer />
            <Suspense fallback={<RouteFallback />}>
                <Routes>
                    <Route path={ROUTES.login} element={<LoginPage />} />
                    <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
                    <Route path={ROUTES.contactAdmin} element={<ContactAdminPage />} />
                    <Route path="/" element={<Navigate to={ROUTES.dashboard} replace />} />

                    <Route element={<ProtectedRoute />}>
                        <Route element={<MainLayout />}>
                            <Route path={ROUTES.dashboard} element={<DashboardPage />} />
                            <Route path={ROUTES.leads} element={<LeadsPage />} />
                            <Route path={`${ROUTES.leads}/new`} element={<AddLeadPage />} />
                            <Route path={`${ROUTES.leads}/:id/edit`} element={<EditLeadPage />} />
                            <Route path={`${ROUTES.leads}/:id`} element={<LeadDetailsPage />} />
                            <Route path={ROUTES.companies} element={<CompaniesPage />} />
                            <Route path={`${ROUTES.companies}/new`} element={<CompanyForm />} />
                            <Route path={`${ROUTES.companies}/:id/edit`} element={<CompanyForm />} />
                            <Route path={`${ROUTES.companies}/:id`} element={<CompanyDetailsPage />} />
                            <Route path={ROUTES.contacts} element={<ContactsPage />} />
                            <Route path={ROUTES.proposals} element={<ProposalsPage />} />
                            <Route path={`${ROUTES.proposals}/new`} element={<ProposalForm />} />
                            <Route path={`${ROUTES.proposals}/:id`} element={<ProposalDetailsPage />} />
                            <Route path={`${ROUTES.proposals}/:id/edit`} element={<ProposalForm />} />
                            <Route path={`${ROUTES.proposals}/:id/preview`} element={<ProposalPreviewPage />} />
                            <Route path={ROUTES.tasks} element={<TasksPage />} />
                            <Route path={ROUTES.settings} element={<SettingsPage />} />
                            <Route path={ROUTES.reports} element={<ReportsPage />} />
                            <Route path={ROUTES.subscriptions} element={<SubscriptionsPage />} />
                            <Route path={ROUTES.invoices} element={<InvoicesPage />} />
                            <Route path={ROUTES.analytics} element={<AnalyticsPage />} />
                            <Route path={ROUTES.users} element={<RoleRoute allowedRoles={['Admin']}><UsersPage /></RoleRoute>} />
                            <Route path={ROUTES.unauthorized} element={<NotAuthorizedPage />} />
                        </Route>
                    </Route>

                    <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
                </Routes>
            </Suspense>
        </>
    );
}

export default App;
