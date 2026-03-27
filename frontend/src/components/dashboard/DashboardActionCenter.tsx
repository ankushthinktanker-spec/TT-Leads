import { CalendarClock, FileCheck2, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';
import { dashboardToneStyles, type DashboardTone } from './DashboardPrimitives';

type ReminderItem = {
    id: string;
    title: string;
    subtitle: string;
    dueLabel: string;
    tone: DashboardTone;
};

interface DashboardActionCenterProps {
    items: ReminderItem[];
}

export default function DashboardActionCenter({ items }: DashboardActionCenterProps) {
    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div key={item.id} className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-xl border', dashboardToneStyles[item.tone])}>
                                    {item.tone === 'danger' ? (
                                        <ShieldAlert className="h-4 w-4" />
                                    ) : item.tone === 'warning' ? (
                                        <CalendarClock className="h-4 w-4" />
                                    ) : (
                                        <FileCheck2 className="h-4 w-4" />
                                    )}
                                </span>
                                <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                            </div>
                            <p className="text-xs text-slate-500">{item.subtitle}</p>
                        </div>
                        <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold', dashboardToneStyles[item.tone])}>
                            {item.dueLabel}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
