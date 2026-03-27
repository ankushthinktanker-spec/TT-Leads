import { BellRing, CheckCheck, Clock3, ReceiptText, Target } from 'lucide-react';
import { cn } from '../../lib/utils';
import { dashboardToneStyles, type DashboardTone } from './DashboardPrimitives';

type ActivityItem = {
    _id: string;
    subject: string;
    type?: string;
    activityDate?: string;
};

interface DashboardRecentActivityProps {
    activities: ActivityItem[];
    getActivityTone: (type?: string) => DashboardTone;
    safeDateLabel: (date?: string) => string;
    compact?: boolean;
}

export default function DashboardRecentActivity({
    activities,
    getActivityTone,
    safeDateLabel,
    compact = false
}: DashboardRecentActivityProps) {
    return (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
            {activities.map((activity, idx) => {
                const tone = getActivityTone(activity.type);
                const isLast = idx === activities.length - 1;
                return (
                    <div
                        key={activity._id}
                        className={cn(
                            'group flex gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50/80',
                            !isLast && 'border-b border-slate-100/80'
                        )}
                    >
                        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border', dashboardToneStyles[tone])}>
                            {activity.type === 'proposal' ? (
                                <ReceiptText className="h-3.5 w-3.5" />
                            ) : activity.type === 'subscription' ? (
                                <BellRing className="h-3.5 w-3.5" />
                            ) : activity.type === 'task' ? (
                                <CheckCheck className="h-3.5 w-3.5" />
                            ) : (
                                <Target className="h-3.5 w-3.5" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className={cn('font-semibold text-slate-800', compact ? 'text-[13px] leading-5' : 'text-sm leading-6')}>
                                {activity.subject}
                            </p>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                                <Clock3 className="h-3 w-3" />
                                {safeDateLabel(activity.activityDate)}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
