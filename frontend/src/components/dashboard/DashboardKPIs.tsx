import { Link } from 'react-router-dom';
import { Users, UserPlus, Target, Percent, Zap, AlertCircle } from 'lucide-react';
import Skeleton from '../ui/Skeleton';
import { DashboardData } from '../../types/dashboard';

interface DashboardKPIsProps {
    data: DashboardData | null;
    loading: boolean;
}

const DashboardKPIs = ({ data, loading }: DashboardKPIsProps) => {
    const kpis = data?.kpis;
    const wonCount = kpis?.wonCount || 0;
    const lostCount = kpis?.lostCount || 0;
    const wonRate = wonCount + lostCount ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;
    const avgResponseHours = kpis?.avgFirstResponseMins
        ? (kpis.avgFirstResponseMins / 60).toFixed(1)
        : '0.0';
    const overdueCount = data?.followups?.leads?.overdue?.length || 0;

    const summaryCards = [
        { label: 'Total Leads', value: kpis?.totalLeads || 0, link: '/leads', icon: <Users size={20} />, color: 'bg-brand-50 text-brand-600 border-brand-100', meta: 'All active demand' },
        { label: 'New Leads', value: kpis?.newLeads || 0, link: '/leads?status=New', icon: <UserPlus size={20} />, color: 'bg-indigo-50 text-indigo-600 border-indigo-100', meta: 'Fresh this cycle' },
        { label: 'Won Deals', value: wonCount, link: '/leads?status=Won', icon: <Target size={20} />, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', meta: 'Closed successfully' },
        { label: 'Won Rate', value: `${wonRate}%`, link: '/leads?status=Won', icon: <Percent size={20} />, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', meta: 'Decision efficiency' },
        { label: 'Avg Response', value: `${avgResponseHours} hrs`, link: '/tasks', icon: <Zap size={20} />, color: 'bg-amber-50 text-amber-600 border-amber-100', meta: 'Speed to first touch' },
        { label: 'Overdue Follow-ups', value: overdueCount, link: '/tasks', icon: <AlertCircle size={20} />, color: 'bg-red-50 text-red-600 border-red-100', meta: 'Action backlog' }
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={`kpi-skeleton-${idx}`} className="metric-card space-y-4">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-1/2" />
                            <Skeleton className="h-6 w-3/4" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {summaryCards.map((card) => (
                <Link
                    key={card.label}
                    to={card.link}
                    className="metric-card group block"
                >
                    <div className="flex h-full flex-col justify-between gap-5">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-transform group-hover:scale-105 ${card.color}`}>
                            {card.icon}
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                {card.label}
                            </p>
                            <h3 className="mt-2 text-[1.9rem] font-black tracking-[-0.04em] text-slate-950 transition-colors group-hover:text-brand-600">
                                {card.value}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">{card.meta}</p>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
};

export default DashboardKPIs;
