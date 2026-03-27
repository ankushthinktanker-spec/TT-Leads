import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import Card from './Card';

interface StatCardProps {
    label: string;
    value: ReactNode;
    helper?: ReactNode;
    icon?: ReactNode;
    className?: string;
}

const StatCard = ({ label, value, helper, icon, className }: StatCardProps) => {
    return (
        <Card variant="surface" className={cn('relative overflow-hidden p-6', className)}>
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
                {icon && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 shadow-sm border border-brand-100/50 transition-transform group-hover:rotate-12">
                        {icon}
                    </div>
                )}
            </div>
            <div className="text-3xl font-bold tracking-tight text-slate-900 mb-2">{value}</div>
            {helper && (
                <div className="border-t border-slate-100 pt-3 mt-3">
                    {helper}
                </div>
            )}
            {/* Subtle brand accent */}
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-brand-500/5 rounded-full blur-2xl" />
        </Card>
    );
};

export default StatCard;
