import { Target, Users, CalendarClock, Zap, ShieldCheck, ArrowUpRight } from 'lucide-react';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import InlineAlert from '../ui/InlineAlert';
import { DashboardData } from '../../types/dashboard';
import PanelHeader from '../ui/PanelHeader';

interface DashboardSnapshotProps {
    data: DashboardData | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
}

const DashboardSnapshot = ({ data, loading, error, onRetry }: DashboardSnapshotProps) => {
    const wonCount = data?.kpis?.wonCount || 0;
    const lostCount = data?.kpis?.lostCount || 0;
    const conversionRate = wonCount + lostCount ? ((wonCount / (wonCount + lostCount)) * 100).toFixed(1) : '0.0';

    const snapshotRows = [
        {
            label: 'Volume',
            title: 'Leads Pending',
            value: data?.kpis?.openLeads || 0,
            progress: 65,
            icon: Users,
            tone: 'neutral' as const
        },
        {
            label: 'Quality',
            title: 'Qualified Leads',
            value: data?.kpis?.qualifiedLeads || 0,
            progress: 42,
            icon: Target,
            tone: 'success' as const
        },
        {
            label: 'Action Required',
            title: 'Follow-ups Due Today',
            value: data?.kpis?.followUpsDueToday || 0,
            progress: 88,
            icon: CalendarClock,
            tone: 'warning' as const
        }
    ];

    const toneClasses = {
        neutral: 'bg-slate-100 text-slate-600 border-slate-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        warning: 'bg-amber-50 text-amber-700 border-amber-100'
    };

    const progressClasses = {
        neutral: 'bg-slate-800',
        success: 'bg-emerald-500',
        warning: 'bg-amber-500'
    };

    return (
        <Card variant="panel" className="overflow-hidden">
            <div className="border-b border-slate-200/70 px-6 py-6">
                <PanelHeader
                    icon={ShieldCheck}
                    eyebrow="Executive summary"
                    title="Health Overview"
                    description="A compact read on lead quality, current workload, and response momentum."
                    actions={
                        <div className="hidden rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-700 md:flex md:items-center md:gap-2">
                            <Zap size={14} />
                            System operating normally
                        </div>
                    }
                />
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[22px] border border-slate-200/80 bg-white/80 px-4 py-3 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Conversion focus</p>
                        <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                            {conversionRate}%
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Qualified to won performance</p>
                    </div>
                    <div className="rounded-[22px] border border-slate-200/80 bg-white/80 px-4 py-3 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Velocity</p>
                        <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                            {data?.kpis?.avgFirstResponseMins ? (data.kpis.avgFirstResponseMins / 60).toFixed(1) : '0.0'}h
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Average first response time</p>
                    </div>
                    <div className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,#faf5ff_0%,#f5f3ff_100%)] px-4 py-3 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500">Attention needed</p>
                        <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                            {data?.followups?.leads?.overdue?.length || 0}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Overdue follow-ups this cycle</p>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6">
                {loading ? (
                    <div className="space-y-6">
                        {Array.from({ length: 3 }).map((_, idx) => (
                            <div key={idx} className="flex items-center gap-5">
                                <Skeleton className="h-12 w-12 rounded-xl" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-1/3" />
                                    <Skeleton className="h-3 w-full max-w-[200px] rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="py-8">
                        <InlineAlert
                            message="Failed to load dashboard metrics."
                            onRetry={onRetry}
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {snapshotRows.map((row) => {
                            const Icon = row.icon;
                            return (
                                <div key={row.title} className="group flex items-center gap-5 rounded-[24px] border border-slate-200/80 bg-white/85 px-4 py-4 shadow-[0_10px_22px_rgba(15,23,42,0.04)] transition-all hover:border-brand-200 hover:shadow-[0_18px_34px_rgba(15,23,42,0.06)]">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneClasses[row.tone]}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="mb-2 flex items-end justify-between">
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{row.label}</p>
                                                <h4 className="mt-1 text-base font-bold tracking-[-0.02em] text-slate-900">{row.title}</h4>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[1.8rem] font-black tracking-[-0.04em] text-slate-950">{row.value}</p>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className={`h-full rounded-full ${progressClasses[row.tone]}`}
                                                style={{ width: `${row.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="border-t border-slate-200/70 bg-slate-50/70 px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Zap size={14} className="text-emerald-500" />
                        <p className="text-xs font-medium text-slate-500">System operating normally</p>
                    </div>
                    <div className="hidden items-center gap-1 text-xs font-semibold text-brand-600 md:flex">
                        View detailed health
                        <ArrowUpRight size={14} />
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default DashboardSnapshot;
