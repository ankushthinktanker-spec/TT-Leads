import { useState } from 'react';
import {
    ArrowRight,
    BellRing,
    CalendarClock,
    CircleAlert,
    FileCheck2,
    Flame,
    CalendarCheck,
    ChevronDown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { dashboardToneStyles, type DashboardTone } from './DashboardPrimitives';

export type WorklistItem = {
    id: string;
    title: string;
    subtitle: string;
    value: string;
    tone: DashboardTone;
    category: 'overdue' | 'today' | 'hot' | 'pending' | 'renewal';
};

interface DashboardPriorityWorklistProps {
    items: WorklistItem[];
}

const categoryIcon = (category: WorklistItem['category']) => {
    switch (category) {
        case 'overdue':
            return <CircleAlert className="h-4 w-4" />;
        case 'today':
            return <CalendarClock className="h-4 w-4" />;
        case 'hot':
            return <Flame className="h-4 w-4" />;
        case 'pending':
            return <FileCheck2 className="h-4 w-4" />;
        case 'renewal':
            return <CalendarCheck className="h-4 w-4" />;
        default:
            return <BellRing className="h-4 w-4" />;
    }
};

const urgencyLabel = (category: WorklistItem['category']) => {
    switch (category) {
        case 'overdue':
            return 'URGENT';
        case 'today':
            return 'TODAY';
        case 'hot':
            return 'HOT';
        case 'pending':
            return 'REVIEW';
        case 'renewal':
            return 'RENEW';
        default:
            return '';
    }
};

export default function DashboardPriorityWorklist({ items }: DashboardPriorityWorklistProps) {
    const [expanded, setExpanded] = useState(true);
    const urgentItems = items.filter((i) => i.category === 'overdue' || i.category === 'hot');
    const otherItems = items.filter((i) => i.category !== 'overdue' && i.category !== 'hot');

    return (
        <div className="space-y-1">
            {/* Urgent section */}
            {urgentItems.length > 0 && (
                <div className="space-y-2">
                    {urgentItems.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className="group flex w-full items-center gap-3 rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50/80 to-white px-3.5 py-3 text-left transition-all duration-200 hover:border-rose-200 hover:shadow-[0_4px_16px_rgba(225,29,72,0.08)]"
                        >
                            <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', dashboardToneStyles[item.tone])}>
                                {categoryIcon(item.category)}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                    <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-rose-600">
                                        {urgencyLabel(item.category)}
                                    </span>
                                </div>
                                <p className="mt-0.5 truncate text-xs text-slate-500">{item.subtitle}</p>
                            </div>
                            <div className="flex items-center gap-1.5 pl-2">
                                <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold', dashboardToneStyles[item.tone])}>
                                    {item.value}
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Divider */}
            {urgentItems.length > 0 && otherItems.length > 0 && (
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="flex w-full items-center gap-2 px-1 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 transition-colors hover:text-slate-600"
                >
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="flex items-center gap-1">
                        Scheduled
                        <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
                    </span>
                    <div className="h-px flex-1 bg-slate-100" />
                </button>
            )}

            {/* Other items */}
            {expanded && otherItems.length > 0 && (
                <div className="space-y-1.5">
                    {otherItems.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className="group flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5 text-left transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-[0_4px_12px_rgba(15,23,42,0.04)]"
                        >
                            <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', dashboardToneStyles[item.tone])}>
                                {categoryIcon(item.category)}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold text-slate-800">{item.title}</p>
                                <p className="truncate text-xs text-slate-500">{item.subtitle}</p>
                            </div>
                            <div className="flex items-center gap-1.5 pl-2">
                                <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold', dashboardToneStyles[item.tone])}>
                                    {item.value}
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
