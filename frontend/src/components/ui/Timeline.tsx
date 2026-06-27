import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import Skeleton from './Skeleton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimelineItem {
    id: string;
    /** Icon rendered inside the dot — e.g. <Phone size={14} /> */
    icon?: ReactNode;
    /** Tailwind class for the dot background + icon colour, e.g. 'bg-emerald-100 text-emerald-600' */
    iconVariant?: string;
    title: ReactNode;
    description?: ReactNode;
    /** Pre-formatted relative timestamp string, e.g. "2 hours ago" */
    timestamp?: string;
    /** Extra content below description — badges, links, etc. */
    meta?: ReactNode;
}

export interface TimelineProps {
    items: TimelineItem[];
    loading?: boolean;
    skeletonCount?: number;
    className?: string;
}

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------

const TimelineSkeleton = () => (
    <li className="flex gap-4 pb-6">
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        <div className="flex-1 pt-1.5 space-y-2">
            <Skeleton className="h-4 w-3/5 rounded-md" />
            <Skeleton className="h-3 w-4/5 rounded-md" />
        </div>
    </li>
);

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

/**
 * Vertical activity / event timeline. Used on lead detail pages, audit logs,
 * and any chronological activity feed.
 *
 * @example
 * const items: TimelineItem[] = activities.map((a) => ({
 *   id: a._id,
 *   icon: <Phone size={14} />,
 *   iconVariant: 'bg-brand-100 text-brand-700',
 *   title: a.subject,
 *   description: a.description,
 *   timestamp: formatDistanceToNow(new Date(a.activityDate)),
 * }));
 *
 * <Timeline items={items} loading={loading} />
 */
const Timeline = ({ items, loading, skeletonCount = 4, className }: TimelineProps) => {
    if (loading) {
        return (
            <ol className={cn('space-y-0', className)} aria-busy="true" aria-label="Loading activities">
                {Array.from({ length: skeletonCount }).map((_, i) => (
                    <TimelineSkeleton key={i} />
                ))}
            </ol>
        );
    }

    if (!items.length) return null;

    return (
        <ol
            className={cn('relative space-y-0', className)}
            aria-label="Activity timeline"
        >
            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                return (
                    <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                        {/* Vertical connector — hidden on last item */}
                        {!isLast && (
                            <span
                                aria-hidden="true"
                                className="absolute left-[18px] top-9 bottom-0 w-px bg-slate-200"
                            />
                        )}

                        {/* Dot / icon */}
                        <div
                            aria-hidden="true"
                            className={cn(
                                'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 shadow-sm',
                                item.iconVariant ?? 'bg-[#fffdf9] text-slate-400'
                            )}
                        >
                            {item.icon}
                        </div>

                        {/* Content */}
                        <div className="flex min-w-0 flex-1 flex-col pt-1.5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="text-sm font-semibold leading-5 text-slate-800">
                                    {item.title}
                                </div>
                                {item.timestamp && (
                                    <time
                                        className="shrink-0 text-xs text-slate-400"
                                        title={item.timestamp}
                                    >
                                        {item.timestamp}
                                    </time>
                                )}
                            </div>

                            {item.description && (
                                <div className="mt-1 text-sm leading-6 text-slate-500">
                                    {item.description}
                                </div>
                            )}

                            {item.meta && <div className="mt-2">{item.meta}</div>}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
};

export default Timeline;
