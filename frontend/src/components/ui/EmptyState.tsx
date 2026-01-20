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
        <div className={cn('empty-state', className)}>
            {icon && <div className="mb-3 text-secondary-500">{icon}</div>}
            <p className="text-base font-semibold text-secondary-200">{title}</p>
            {description && <p className="text-sm text-secondary-500 mt-1">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
};

export default EmptyState;
