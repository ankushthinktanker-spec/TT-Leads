import { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

type InlineAlertTone = 'danger' | 'warning' | 'success' | 'info' | 'muted';

interface InlineAlertProps {
    tone?: InlineAlertTone;
    title?: string;
    children: ReactNode;
    className?: string;
    action?: ReactNode;
}

const toneIcon = {
    danger: AlertCircle,
    warning: AlertTriangle,
    success: CheckCircle2,
    info: Info,
    muted: Info,
} as const;

const toneClass = {
    danger: 'workspace-notice workspace-notice--danger',
    warning: 'workspace-notice workspace-notice--warning',
    success: 'workspace-notice workspace-notice--success',
    info: 'alert alert-info',
    muted: 'workspace-notice workspace-notice--muted',
} as const;

const InlineAlert = ({ tone = 'info', title, children, className, action }: InlineAlertProps) => {
    const Icon = toneIcon[tone];

    return (
        <div className={cn(toneClass[tone], 'flex items-start gap-3', className)} role="alert">
            <Icon size={18} className="mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
                {title && <p className="text-sm font-semibold text-current">{title}</p>}
                <div className={cn('text-sm', title && 'mt-1')}>{children}</div>
                {action && <div className="mt-3">{action}</div>}
            </div>
        </div>
    );
};

export default InlineAlert;
