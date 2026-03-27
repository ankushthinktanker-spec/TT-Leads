import { ArrowRight, BellRing, CalendarClock, CircleAlert, FileCheck2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { dashboardToneStyles, type DashboardTone } from './DashboardPrimitives';

type QueueItem = {
    id: string;
    title: string;
    subtitle: string;
    value: string;
    tone: DashboardTone;
};

interface DashboardActionQueueProps {
    items: QueueItem[];
}

export default function DashboardActionQueue({ items }: DashboardActionQueueProps) {
    return (
        <div className="space-y-2.5">
            {items.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-white"
                >
                    <div className="flex min-w-0 items-center gap-3">
                        <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-2xl border', dashboardToneStyles[item.tone])}>
                            {item.tone === 'danger' ? (
                                <CircleAlert className="h-4 w-4" />
                            ) : item.tone === 'warning' ? (
                                <CalendarClock className="h-4 w-4" />
                            ) : item.tone === 'success' ? (
                                <FileCheck2 className="h-4 w-4" />
                            ) : (
                                <BellRing className="h-4 w-4" />
                            )}
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                            <p className="truncate text-xs text-slate-500">{item.subtitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pl-3">
                        <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold', dashboardToneStyles[item.tone])}>
                            {item.value}
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                </button>
            ))}
        </div>
    );
}
