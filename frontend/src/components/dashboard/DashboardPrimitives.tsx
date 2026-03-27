import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export type DashboardTone = 'primary' | 'success' | 'warning' | 'danger' | 'info';

export const dashboardToneStyles: Record<DashboardTone, string> = {
    primary: 'bg-[#E9EEFF] text-[#2649D8] border-[#BED0FF]',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200'
};

/* ─── Subtle icon-bg tints used on stat cards ─── */
const iconBgTone: Record<DashboardTone, string> = {
    primary: 'bg-[#EFF3FF] text-[#335CFF] border-[#D6E0FF]',
    success: 'bg-emerald-50/80 text-emerald-600 border-emerald-100',
    warning: 'bg-amber-50/80 text-amber-600 border-amber-100',
    danger: 'bg-rose-50/80 text-rose-600 border-rose-100',
    info: 'bg-sky-50/80 text-sky-600 border-sky-100'
};

interface DashboardHeroMetric {
    label: string;
    value: string;
    note: string;
    noteTone?: string;
}

interface DashboardHeroProps {
    title: string;
    description: string;
    actions?: ReactNode;
    metrics: DashboardHeroMetric[];
}

interface DashboardStatCardProps {
    title: string;
    value: string;
    delta: string;
    note: string;
    tone: DashboardTone;
    icon: LucideIcon;
}

interface DashboardPanelProps {
    title: string;
    subtitle?: string;
    action?: string;
    children: ReactNode;
    className?: string;
}

/* ════════════════════════════════════════
   HERO — Premium greeting block
════════════════════════════════════════ */
export const DashboardHero = ({ title, description, actions, metrics }: DashboardHeroProps) => (
    <section className="relative overflow-hidden rounded-[22px] border border-slate-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-5 py-6 shadow-[0_12px_32px_rgba(15,23,42,0.04)] md:px-7">
        {/* Decorative radial accent */}
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[30%] bg-[radial-gradient(circle_at_top_right,rgba(51,92,255,0.08),transparent_60%)] lg:block" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-4">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 rounded-full border border-[#BED0FF]/80 bg-[#E9EEFF]/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2649D8]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Revenue Command Center
                </div>

                {/* Greeting */}
                <div className="space-y-2">
                    <h1 className="max-w-3xl text-[26px] font-extrabold tracking-[-0.04em] text-slate-950 md:text-[34px] leading-[1.15]">
                        {title}
                    </h1>
                    <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
                        {description}
                    </p>
                </div>

                {/* Mini inline metrics */}
                <div className="flex flex-wrap gap-2.5">
                    {metrics.map((metric) => (
                        <div key={metric.label} className="rounded-xl border border-slate-200/70 bg-white/80 px-3.5 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{metric.label}</p>
                            <div className="mt-1 flex items-end gap-1.5">
                                <span className="text-xl font-extrabold tracking-tight text-slate-950">{metric.value}</span>
                                <span className={cn('pb-0.5 text-[11px] font-semibold', metric.noteTone ?? 'text-slate-500')}>{metric.note}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {actions ? <div className="flex flex-wrap items-center gap-3 xl:justify-end">{actions}</div> : null}
        </div>
    </section>
);

/* ════════════════════════════════════════
   STAT CARD — Refined KPI card
════════════════════════════════════════ */
export const DashboardStatCard = ({ title, value, delta, note, tone, icon: Icon }: DashboardStatCardProps) => (
    <div className="group rounded-[18px] border border-slate-200/70 bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-3">
            <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{title}</p>
                <p className="mt-2 text-[28px] font-extrabold tracking-[-0.04em] text-slate-950 leading-none">{value}</p>
            </div>
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl border transition-colors', iconBgTone[tone])}>
                <Icon className="h-[18px] w-[18px]" />
            </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-bold', delta.startsWith('-') ? dashboardToneStyles.danger : dashboardToneStyles.success)}>
                {delta.startsWith('-') ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                {delta}
            </span>
            <span className="text-xs text-slate-400">{note}</span>
        </div>
    </div>
);

/* ════════════════════════════════════════
   PANEL — Section container
════════════════════════════════════════ */
export const DashboardPanel = ({ title, subtitle, action, children, className }: DashboardPanelProps) => (
    <section className={cn('rounded-[20px] border border-slate-200/70 bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.03)] md:p-6', className)}>
        <div className="flex items-start justify-between gap-4">
            <div>
                <h2 className="text-[17px] font-bold tracking-tight text-slate-950">{title}</h2>
                {subtitle ? <p className="mt-0.5 text-[13px] leading-5 text-slate-400">{subtitle}</p> : null}
            </div>
            {action ? <span className="shrink-0 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{action}</span> : null}
        </div>
        <div className="mt-4">{children}</div>
    </section>
);
