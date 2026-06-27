import { useEffect, useMemo, useRef } from 'react';
import { Bell, Menu, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useGlobalSearch } from '../../context/GlobalSearchContext';
import { ROUTES } from '../../routes';

interface NavbarProps {
    onOpenNavigation: () => void;
}

const routeTitles = [
    { key: ROUTES.dashboard, title: 'Dashboard', subtitle: 'Command center' },
    { key: ROUTES.leads, title: 'Leads', subtitle: 'Pipeline execution' },
    { key: ROUTES.companies, title: 'Companies', subtitle: 'Account registry' },
    { key: ROUTES.contacts, title: 'Contacts', subtitle: 'People and relationships' },
    { key: ROUTES.proposals, title: 'Proposals', subtitle: 'Commercial documents' },
    { key: ROUTES.tasks, title: 'Tasks', subtitle: 'Worklist' },
    { key: ROUTES.reports, title: 'Reports', subtitle: 'Business visibility' },
    { key: ROUTES.analytics, title: 'Analytics', subtitle: 'Trends and signals' },
    { key: ROUTES.users, title: 'Users', subtitle: 'Access management' },
    { key: ROUTES.settings, title: 'Settings', subtitle: 'Workspace configuration' },
    { key: ROUTES.invoices, title: 'Invoices', subtitle: 'Revenue operations' },
    { key: ROUTES.subscriptions, title: 'Subscriptions', subtitle: 'Renewal operations' },
];

const Navbar = ({ onOpenNavigation }: NavbarProps) => {
    const { scope, value: searchValue, setValue: setSearchValue } = useGlobalSearch();
    const inputRef = useRef<HTMLInputElement>(null);
    const location = useLocation();

    const pageMeta = useMemo(
        () => routeTitles.find((item) => location.pathname.startsWith(item.key)) ?? { title: 'Workspace', subtitle: 'Operations' },
        [location.pathname]
    );

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                inputRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <header className="flex min-h-[68px] flex-shrink-0 items-center justify-between gap-4 border-b border-slate-200/90 bg-[rgba(255,250,244,0.92)] px-4 backdrop-blur-xl md:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <button
                    type="button"
                    onClick={onOpenNavigation}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-[#fffdf9] text-slate-600 shadow-[0_8px_18px_rgba(120,74,24,0.03)] transition hover:border-slate-300 hover:text-slate-900 lg:hidden"
                    aria-label="Open navigation"
                >
                    <Menu size={18} />
                </button>

                <div className="min-w-0 lg:hidden">
                    <div className="truncate text-sm font-extrabold tracking-[-0.03em] text-slate-950">{pageMeta.title}</div>
                    <div className="truncate text-[11px] font-medium text-slate-500">{pageMeta.subtitle}</div>
                </div>

                {scope.enabled ? (
                    <div className="relative hidden max-w-[500px] flex-1 md:block">
                        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchValue}
                            onChange={(event) => setSearchValue(event.target.value)}
                            placeholder={`${scope.placeholder} (Ctrl+K)`}
                            aria-label={scope.label}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#fffdf9_0%,#f8eee2_100%)] pl-11 pr-20 text-sm font-medium text-slate-700 shadow-[0_8px_18px_rgba(120,74,24,0.03)] outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-[#fffdf9] focus:ring-4 focus:ring-brand-500/10"
                        />
                        <kbd className="absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg border border-slate-200 bg-[#fdf2e7] px-2 py-1 text-[10px] font-semibold text-slate-400 sm:inline-flex">
                            Ctrl K
                        </kbd>
                    </div>
                ) : (
                    <div className="hidden rounded-2xl border border-slate-200 bg-[#fdf2e7] px-4 py-2 text-sm font-medium text-slate-500 md:flex">
                        {pageMeta.subtitle}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                {scope.enabled && (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.focus()}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-[#fffdf9] text-slate-500 shadow-[0_8px_18px_rgba(120,74,24,0.03)] transition hover:border-slate-300 hover:text-slate-700 md:hidden"
                        aria-label={`Open ${scope.label}`}
                    >
                        <Search size={17} />
                    </button>
                )}

                <button
                    type="button"
                    aria-label="Open notifications"
                    className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-[#fffdf9] text-slate-500 shadow-[0_8px_18px_rgba(120,74,24,0.03)] transition hover:border-slate-300 hover:text-slate-700"
                >
                    <Bell size={17} />
                    <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white" />
                    <span className="sr-only">Unread notifications available</span>
                </button>
            </div>
        </header>
    );
};

export default Navbar;
