import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, Building2, Phone, FileText,
    CheckSquare, BarChart2, TrendingUp, Settings, UserCog,
    ChevronRight, Zap, Receipt,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { logout } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes';
import { cn } from '../../lib/utils';

interface NavItem {
    label: string;
    to: string;
    icon: React.ReactNode;
    roles?: string[];
    end?: boolean;
}

const navGroups: { label: string; items: NavItem[] }[] = [
    {
        label: 'Core',
        items: [
            { label: 'Dashboard',  to: ROUTES.dashboard,  icon: <LayoutDashboard size={18} />, end: true },
            { label: 'Leads',      to: ROUTES.leads,       icon: <Users size={18} /> },
            { label: 'Companies',  to: ROUTES.companies,   icon: <Building2 size={18} /> },
            { label: 'Contacts',   to: '/contacts',        icon: <Phone size={18} /> },
            { label: 'Proposals',  to: ROUTES.proposals,   icon: <FileText size={18} /> },
            { label: 'Invoices',   to: ROUTES.invoices,    icon: <Receipt size={18} /> },
            { label: 'Subscriptions', to: ROUTES.subscriptions, icon: <CheckSquare size={18} /> },
            { label: 'Tasks',      to: ROUTES.tasks,       icon: <CheckSquare size={18} /> },
        ],
    },
    {
        label: 'Insights',
        items: [
            { label: 'Reports',    to: '/reports',   icon: <BarChart2 size={18} /> },
            { label: 'Analytics',  to: '/analytics', icon: <TrendingUp size={18} /> },
        ],
    },
    {
        label: 'Admin',
        items: [
            { label: 'Users',      to: '/users',    icon: <UserCog size={18} />, roles: ['Admin', 'Manager', 'Operator'] },
            { label: 'Settings',   to: ROUTES.settings, icon: <Settings size={18} /> },
        ],
    },
];

const NavLink = ({ item }: { item: NavItem }) => {
    const location = useLocation();
    const isActive = item.end
        ? location.pathname === item.to
        : location.pathname.startsWith(item.to);

    return (
        <Link
            to={item.to}
            className={cn(
                'sidebar-link group',
                isActive && 'sidebar-link-active'
            )}
        >
            <span className={cn('flex-shrink-0', isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600')}>
                {item.icon}
            </span>
            <span className="flex-1 text-sm">{item.label}</span>
            {isActive && <ChevronRight size={14} className="text-brand-400 flex-shrink-0" />}
        </Link>
    );
};

const Sidebar = () => {
    const { user } = useAppSelector((state) => state.auth);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await dispatch(logout());
        navigate('/login');
    };

    const userRole = user?.role || '';
    const initials = user
        ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
        : '?';

    return (
        <aside className="flex h-screen w-[248px] flex-shrink-0 flex-col border-r border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[10px_0_24px_rgba(15,23,42,0.03)] backdrop-blur-xl">
            {/* Logo */}
            <div className="flex items-center gap-3 border-b border-slate-200/80 px-5 py-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#335CFF_0%,#2649D8_100%)] text-white shadow-[0_10px_22px_rgba(51,92,255,0.24)] flex-shrink-0">
                    <Zap size={18} fill="white" />
                </div>
                <div>
                    <p className="text-sm font-extrabold tracking-[-0.03em] text-slate-900 leading-none">ThinkTanker</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Revenue CRM</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
                {navGroups.map((group) => {
                    const visibleItems = group.items.filter((item) =>
                        !item.roles || item.roles.includes(userRole)
                    );
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={group.label}>
                            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                {group.label}
                            </p>
                            <div className="space-y-0.5">
                                {visibleItems.map((item) => (
                                    <NavLink key={item.to} item={item} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* User Card */}
            <div className="border-t border-slate-200/80 px-4 pb-5 pt-4">
                <div className="group flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition-all hover:border-[#BED0FF] hover:bg-white">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#E9EEFF] text-[#335CFF] text-xs font-bold ring-2 ring-[#E9EEFF]">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                            {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
                            {userRole}
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        title="Sign out"
                        className="rounded-xl p-2 text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
