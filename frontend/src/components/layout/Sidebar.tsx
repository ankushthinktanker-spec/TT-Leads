import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, Building2, Phone, FileText,
    CheckSquare, BarChart2, TrendingUp, Settings, UserCog,
    ChevronRight, Receipt, X, LogOut,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { logout } from '../../store/slices/authSlice';
import { ROUTES } from '../../routes';
import { cn } from '../../lib/utils';
import ThinkTankerLogo from '../branding/ThinkTankerLogo';

interface NavItem {
    label: string;
    to: string;
    icon: React.ReactNode;
    roles?: string[];
    end?: boolean;
}

interface SidebarProps {
    mobileOpen: boolean;
    onCloseMobile: () => void;
}

const navGroups: { label: string; items: NavItem[] }[] = [
    {
        label: 'Core',
        items: [
            { label: 'Dashboard', to: ROUTES.dashboard, icon: <LayoutDashboard size={18} />, end: true },
            { label: 'Leads', to: ROUTES.leads, icon: <Users size={18} /> },
            { label: 'Companies', to: ROUTES.companies, icon: <Building2 size={18} /> },
            { label: 'Contacts', to: ROUTES.contacts, icon: <Phone size={18} /> },
            { label: 'Proposals', to: ROUTES.proposals, icon: <FileText size={18} /> },
            { label: 'Invoices', to: ROUTES.invoices, icon: <Receipt size={18} /> },
            { label: 'Subscriptions', to: ROUTES.subscriptions, icon: <CheckSquare size={18} /> },
            { label: 'Tasks', to: ROUTES.tasks, icon: <CheckSquare size={18} /> },
        ],
    },
    {
        label: 'Insights',
        items: [
            { label: 'Reports', to: ROUTES.reports, icon: <BarChart2 size={18} /> },
            { label: 'Analytics', to: ROUTES.analytics, icon: <TrendingUp size={18} /> },
        ],
    },
    {
        label: 'Admin',
        items: [
            { label: 'Users', to: ROUTES.users, icon: <UserCog size={18} />, roles: ['Admin'] },
            { label: 'Settings', to: ROUTES.settings, icon: <Settings size={18} /> },
        ],
    },
];

const NavLink = ({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) => {
    const location = useLocation();
    const isActive = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);

    return (
        <Link
            to={item.to}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={cn('sidebar-link group', isActive && 'sidebar-link-active')}
        >
            <span className={cn('flex-shrink-0', isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600')}>
                {item.icon}
            </span>
            <span className="flex-1 text-sm">{item.label}</span>
            {isActive && <ChevronRight size={14} className="flex-shrink-0 text-brand-400" />}
        </Link>
    );
};

const Sidebar = ({ mobileOpen, onCloseMobile }: SidebarProps) => {
    const { user } = useAppSelector((state) => state.auth);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const closeAndNavigate = () => {
        if (mobileOpen) onCloseMobile();
    };

    const handleLogout = async () => {
        await dispatch(logout());
        navigate('/login');
    };

    const userRole = user?.role || '';
    const initials = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : '?';

    const sidebarContent = (
        <>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-5">
                <div className="min-w-0 flex-1">
                    <ThinkTankerLogo className="h-11 max-w-[180px]" />
                </div>
                <button
                    type="button"
                    onClick={onCloseMobile}
                    aria-label="Close navigation"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-[#fffdf9] text-slate-500 transition hover:border-slate-300 hover:text-slate-700 lg:hidden"
                >
                    <X size={18} />
                </button>
            </div>

            <nav aria-label="Primary workspace navigation" className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
                {navGroups.map((group) => {
                    const visibleItems = group.items.filter((item) => !item.roles || item.roles.includes(userRole));
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={group.label}>
                            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{group.label}</p>
                            <div className="space-y-0.5">
                                {visibleItems.map((item) => (
                                    <NavLink key={item.to} item={item} onNavigate={closeAndNavigate} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </nav>

            <div className="border-t border-slate-200/80 px-4 pb-5 pt-4">
                <div className="flex items-center gap-3 px-1 py-1.5">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-xs font-bold text-brand-700">
                        {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{user?.firstName} {user?.lastName}</p>
                        <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">{userRole}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        title="Sign out"
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                        aria-label="Sign out"
                    >
                        <LogOut size={14} />
                        <span className="hidden xl:inline">Sign out</span>
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <>
            <aside className="hidden h-screen w-[248px] flex-shrink-0 flex-col border-r border-slate-200/90 bg-[linear-gradient(180deg,#fffef8_0%,#f8edd3_100%)] shadow-[10px_0_24px_rgba(161,121,0,0.05)] backdrop-blur-xl lg:flex">
                {sidebarContent}
            </aside>

            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        type="button"
                        aria-label="Close navigation backdrop"
                        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
                        onClick={onCloseMobile}
                    />
                    <aside
                        className="absolute inset-y-0 left-0 flex w-[min(88vw,320px)] flex-col bg-[linear-gradient(180deg,#fffef8_0%,#f8edd3_100%)] shadow-[24px_0_60px_rgba(15,23,42,0.18)]"
                        aria-label="Mobile navigation"
                        aria-modal="true"
                        role="dialog"
                    >
                        {sidebarContent}
                    </aside>
                </div>
            )}
        </>
    );
};

export default Sidebar;
