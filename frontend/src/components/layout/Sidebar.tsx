import { Link, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { logout } from '../../store/slices/authSlice';
import { LayoutDashboard, Users, Building2, UserCircle, FileText, CheckSquare, LogOut, Settings as SettingsIcon, TrendingUp } from 'lucide-react';
import api from '../../api/axios';

const BASE_ITEMS = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Leads', path: '/leads', icon: Users },
    { name: 'Companies', path: '/companies', icon: Building2 },
    { name: 'Contacts', path: '/contacts', icon: UserCircle },
    { name: 'Proposals', path: '/proposals', icon: FileText },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Analytics', path: '/analytics', icon: TrendingUp },
];

const Sidebar = () => {
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);

    const menuItems = useMemo(() => (
        user?.role === 'Admin'
            ? [...BASE_ITEMS, { name: 'Users', path: '/users', icon: UserCircle }, { name: 'Settings', path: '/settings', icon: SettingsIcon }]
            : [...BASE_ITEMS, { name: 'Settings', path: '/settings', icon: SettingsIcon }]
    ), [user?.role]);
    const [permissionMap, setPermissionMap] = useState<Record<string, Record<string, boolean>> | null>(null);

    useEffect(() => {
        const loadPermissions = async () => {
            try {
                const response = await api.get('/permissions/me');
                setPermissionMap(response.data.data.permissions || {});
            } catch (error) {
                setPermissionMap(null);
            }
        };
        if (user) {
            loadPermissions();
        }
    }, [user]);

    const filteredMenuItems = useMemo(() => {
        if (!permissionMap) return menuItems;
        const moduleMap: Record<string, string> = {
            Dashboard: 'analytics',
            Reports: 'reports',
            Analytics: 'analytics',
            Leads: 'leads',
            Companies: 'companies',
            Contacts: 'contacts',
            Proposals: 'proposals',
            Tasks: 'tasks',
            Users: 'users',
            Settings: 'settings'
        };

        return menuItems.filter((item) => {
            const moduleKey = moduleMap[item.name];
            if (!moduleKey) return true;
            return !!permissionMap?.[moduleKey]?.view;
        });
    }, [menuItems, permissionMap]);

    const isActive = (path: string) => {
        return location.pathname.startsWith(path);
    };

    const handleLogout = () => {
        dispatch(logout());
    };

    return (
        <div className="w-72 bg-secondary-950 text-secondary-50 h-screen sticky top-0 transition-all duration-300 flex flex-col border-r border-white/5 shadow-2xl z-20 overflow-hidden">
            {/* Logo Section */}
            <div className="p-8 pb-4 relative overflow-hidden group">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-primary-500/10 rounded-full blur-3xl group-hover:bg-primary-500/20 transition-all duration-700"></div>
                <div className="flex items-center gap-3 relative z-10">
                    <div className="p-2.5 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl shadow-lg shadow-primary-500/20">
                        <LayoutDashboard className="text-secondary-950" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white">ThinkTanker</h1>
                        <p className="text-[10px] uppercase tracking-widest text-primary-500/80 font-bold">CRM Suite</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-8 space-y-1.5">
                {filteredMenuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`sidebar-link group ${active ? 'sidebar-link-active shadow-lg shadow-primary-500/5' : 'text-secondary-400 hover:bg-white/5 hover:text-secondary-50'}`}
                        >
                            <Icon size={20} className={active ? 'text-primary-400' : 'text-secondary-500 group-hover:text-secondary-300'} />
                            <span className="text-sm font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile Section */}
            <div className="p-6 mt-auto">
                <div className="rounded-2xl border border-amber-200/20 bg-gradient-to-br from-[#1b1b1b] via-[#1f1f1f] to-[#151515] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.45)] transition-all duration-300 hover:border-amber-200/30">
                    <div className="flex items-center gap-3">
                        <div className="relative h-11 w-11 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center font-bold text-neutral-900 shadow-[0_8px_18px_rgba(245,158,11,0.3)]">
                            {user?.firstName?.charAt(0) || 'U'}
                            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#151515] bg-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-amber-50 truncate">{user?.firstName} {user?.lastName}</p>
                            <p className="text-[10px] text-amber-200/70 font-semibold uppercase tracking-[0.22em] truncate">{user?.role}</p>
                        </div>
                    </div>
                    <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-amber-100/20 to-transparent" />
                    <button
                        onClick={handleLogout}
                        className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-amber-200/20 bg-[#1a1a1a] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100/80 transition-all duration-200 hover:border-amber-200/40 hover:text-amber-50"
                    >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
