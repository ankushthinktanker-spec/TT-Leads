import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
    title?: string;
    subtitle?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    variant?: 'raised' | 'surface' | 'glass' | 'muted' | 'panel';
}

const Card = ({ title, subtitle, actions, children, className, variant = 'surface' }: CardProps) => {
    const variantClasses = {
        surface: 'tt-card',
        glass: 'glass-card',
        raised: 'tt-card tt-card-hover',
        muted: 'tt-card-subtle',
        panel: 'panel-card'
    };

    return (
        <div className={cn(variantClasses[variant] || 'tt-card', className)}>
            {(title || subtitle || actions) && (
                <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4 md:px-6 md:py-5">
                    <div>
                        {title && <h3 className="text-[18px] font-bold tracking-tight text-slate-950">{title}</h3>}
                        {subtitle && <div className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</div>}
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>
            )}
            <div className={cn(!title && !subtitle && !actions ? '' : 'px-5 py-4 md:px-6 md:py-5')}>{children}</div>
        </div>
    );
};

export default Card;
