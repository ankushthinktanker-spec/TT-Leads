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
        surface: 'rounded-[18px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]',
        glass: 'rounded-[18px] border border-white/70 bg-white/80 shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur-xl',
        raised: 'rounded-[20px] border border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.06)]',
        muted: 'rounded-[18px] border border-slate-200 bg-slate-50/80 shadow-[0_6px_18px_rgba(15,23,42,0.03)]',
        panel: 'rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] shadow-[0_10px_26px_rgba(15,23,42,0.05)]'
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
