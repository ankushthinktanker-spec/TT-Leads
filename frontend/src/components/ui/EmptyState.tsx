import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
}

const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => {
    return (
        <div className={cn('empty-state rounded-[28px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12', className)}>
            {icon && (
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-slate-200 bg-white text-slate-400 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                    {icon}
                </div>
            )}
            <p className="text-lg font-semibold text-slate-900">{title}</p>
            {description && <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
};

export default EmptyState;

