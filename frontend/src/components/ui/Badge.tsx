import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger';

interface BadgeProps {
    children: ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

const Badge = ({ children, variant = 'neutral', className }: BadgeProps) => {
    return (
        <span
            className={cn(
                'tt-badge',
                variant === 'success' && 'tt-badge-success',
                variant === 'warning' && 'tt-badge-warning',
                variant === 'danger' && 'tt-badge-danger',
                variant === 'neutral' && 'tt-badge-neutral',
                className
            )}
        >
            {children}
        </span>
    );
};

export default Badge;
