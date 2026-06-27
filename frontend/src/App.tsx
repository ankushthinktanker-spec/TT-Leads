import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAppSelector } from './hooks/redux';
import ToastContainer from './components/ui/ToastContainer';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
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
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const MainLayout = lazy(() => import('./components/layout/MainLayout'));

const RouteFallback = () => (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7faff_0%,#edf3f8_100%)] px-5 py-8">
        <div className="mx-auto flex w-full max-w-[1480px] animate-pulse gap-6">
            <div className="hidden h-[calc(100vh-4rem)] w-[248px] rounded-[28px] bg-white/70 lg:block" />
            <div className="flex-1 space-y-5">
                <div className="h-[68px] rounded-[24px] bg-white/70" />
                <div className="h-32 rounded-[30px] bg-white/70" />
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-28 rounded-[24px] bg-white/70" />
                    ))}
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                    <div className="h-80 rounded-[24px] bg-white/70" />
                    <div className="h-80 rounded-[24px] bg-white/70" />
                </div>
            </div>
        </div>
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
                            <Route path={ROUTES.dashboard} element={<ErrorBoundary section="Dashboard"><DashboardPage /></ErrorBoundary>} />
                            <Route path={ROUTES.leads} element={<ErrorBoundary section="Leads"><LeadsPage /></ErrorBoundary>} />
                            <Route path={`${ROUTES.leads}/new`} element={<ErrorBoundary section="Add Lead"><AddLeadPage /></ErrorBoundary>} />
                            <Route path={`${ROUTES.leads}/:id/edit`} element={<ErrorBoundary section="Edit Lead"><EditLeadPage /></ErrorBoundary>} />
                            <Route path={`${ROUTES.leads}/:id`} element={<ErrorBoundary section="Lead Details"><LeadDetailsPage /></ErrorBoundary>} />
                            <Route path={ROUTES.companies} element={<ErrorBoundary section="Companies"><CompaniesPage /></ErrorBoundary>} />
                            <Route path={`${ROUTES.companies}/new`} element={<ErrorBoundary section="Add Company"><CompanyForm /></ErrorBoundary>} />
                            <Route path={`${ROUTES.companies}/:id/edit`} element={<ErrorBoundary section="Edit Company"><CompanyForm /></ErrorBoundary>} />
                            <Route path={`${ROUTES.companies}/:id`} element={<ErrorBoundary section="Company Details"><CompanyDetailsPage /></ErrorBoundary>} />
                            <Route path={ROUTES.contacts} element={<ErrorBoundary section="Contacts"><ContactsPage /></ErrorBoundary>} />
                            <Route path={ROUTES.proposals} element={<ErrorBoundary section="Proposals"><ProposalsPage /></ErrorBoundary>} />
                            <Route path={`${ROUTES.proposals}/new`} element={<ErrorBoundary section="New Proposal"><ProposalForm /></ErrorBoundary>} />
                            <Route path={`${ROUTES.proposals}/:id`} element={<ErrorBoundary section="Proposal Details"><ProposalDetailsPage /></ErrorBoundary>} />
                            <Route path={`${ROUTES.proposals}/:id/edit`} element={<ErrorBoundary section="Edit Proposal"><ProposalForm /></ErrorBoundary>} />
                            <Route path={`${ROUTES.proposals}/:id/preview`} element={<ErrorBoundary section="Proposal Preview"><ProposalPreviewPage /></ErrorBoundary>} />
                            <Route path={ROUTES.tasks} element={<ErrorBoundary section="Tasks"><TasksPage /></ErrorBoundary>} />
                            <Route path={ROUTES.settings} element={<ErrorBoundary section="Settings"><SettingsPage /></ErrorBoundary>} />
                            <Route path={ROUTES.invoices} element={<ErrorBoundary section="Invoices"><InvoicesPage /></ErrorBoundary>} />
                            <Route path={ROUTES.reports} element={
                                <RoleRoute allowedRoles={['Admin', 'Manager']}>
                                    <ErrorBoundary section="Reports"><ReportsPage /></ErrorBoundary>
                                </RoleRoute>
                            } />
                            <Route path={ROUTES.analytics} element={
                                <RoleRoute allowedRoles={['Admin', 'Manager']}>
                                    <ErrorBoundary section="Analytics"><AnalyticsPage /></ErrorBoundary>
                                </RoleRoute>
                            } />
                            <Route path={ROUTES.subscriptions} element={
                                <RoleRoute allowedRoles={['Admin']}>
                                    <ErrorBoundary section="Subscriptions"><SubscriptionsPage /></ErrorBoundary>
                                </RoleRoute>
                            } />
                            <Route path={ROUTES.users} element={
                                <RoleRoute allowedRoles={['Admin']}>
                                    <ErrorBoundary section="Users"><UsersPage /></ErrorBoundary>
                                </RoleRoute>
                            } />
                            <Route path={ROUTES.unauthorized} element={<NotAuthorizedPage />} />
                        </Route>
                    </Route>

                    <Route path="*" element={<Suspense fallback={<RouteFallback />}><NotFoundPage /></Suspense>} />
                </Routes>
            </Suspense>
        </>
    );
}

export default App;
