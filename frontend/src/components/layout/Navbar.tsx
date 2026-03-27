import { useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, Sparkles } from 'lucide-react';
import { useAppSelector } from '../../hooks/redux';

const Navbar = () => {
    const navigate = useNavigate();
    const { user } = useAppSelector((state) => state.auth);

    return (
        <header className="flex h-[68px] flex-shrink-0 items-center justify-between gap-4 border-b border-slate-200/90 bg-white/92 px-5 backdrop-blur-xl md:px-6">
            <div className="relative max-w-[500px] flex-1">
                <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                    type="text"
                    placeholder="Search leads, companies, proposals..."
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] pl-11 pr-20 text-sm font-medium text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.03)] placeholder:text-slate-400 outline-none transition-all focus:border-[#335CFF] focus:bg-white focus:ring-4 focus:ring-[#335CFF]/10"
                />
                <kbd className="absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-400 sm:inline-flex">
                    Ctrl K
                </kbd>
            </div>

            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/leads/new')} className="hidden h-11 items-center gap-2 rounded-2xl bg-[#335CFF] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(51,92,255,0.24)] transition hover:bg-[#2649D8] sm:inline-flex">
                    <Sparkles size={13} />
                    <Plus size={13} />
                    Add Lead
                </button>

                <button className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.03)] transition hover:border-slate-300 hover:text-slate-700">
                    <Bell size={17} />
                    <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#335CFF] ring-2 ring-white" />
                </button>

                <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-[0_8px_18px_rgba(15,23,42,0.04)] md:flex">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#E9EEFF] text-[#335CFF] text-[10px] font-bold">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <div className="leading-none">
                        <p className="text-xs font-semibold text-slate-900">{user?.firstName} {user?.lastName}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">{user?.role}</p>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
