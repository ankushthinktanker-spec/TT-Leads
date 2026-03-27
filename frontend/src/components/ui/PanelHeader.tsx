import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type PanelTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

interface PanelHeaderProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    eyebrow?: string;
    tone?: PanelTone;
    actions?: ReactNode;
    className?: string;
}

const toneClasses: Record<PanelTone, string> = {
    brand: 'panel-icon-brand',
    success: 'panel-icon-success',
    warning: 'panel-icon-warning',
    danger: 'panel-icon-danger',
    neutral: 'panel-icon-neutral'
};

const PanelHeader = ({
    icon: Icon,
    title,
    description,
    eyebrow,
    tone = 'brand',
    actions,
    className
}: PanelHeaderProps) => {
    return (
        <div className={cn('panel-header', className)}>
            <div className="flex items-start gap-4">
                <div className={cn('panel-icon-shell', toneClasses[tone])}>
                    <Icon size={20} />
                </div>
                <div className="min-w-0">
                    {eyebrow && <p className="panel-eyebrow">{eyebrow}</p>}
                    <h2 className="panel-title">{title}</h2>
                    {description && <p className="panel-subtitle">{description}</p>}
                </div>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
};

export default PanelHeader;
