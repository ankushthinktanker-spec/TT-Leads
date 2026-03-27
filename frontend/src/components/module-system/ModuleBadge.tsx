import { cn } from '../../lib/utils';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

interface ModuleBadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    dot?: boolean;
    className?: string;
}

const ModuleBadge = ({ children, variant = 'neutral', dot = true, className }: ModuleBadgeProps) => (
    <span
        className={cn(
            'mod-badge',
            `mod-badge--${variant}`,
            dot && 'mod-badge--dot',
            className
        )}
    >
        {children}
    </span>
);

export default ModuleBadge;
