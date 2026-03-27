import { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from './Button';

interface InlineAlertProps {
    message: ReactNode;
    onRetry?: () => void;
    className?: string;
}

const InlineAlert = ({ message, onRetry, className }: InlineAlertProps) => {
    return (
        <div className={cn('flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm', className)}>
            <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <div>{message}</div>
            </div>
            {onRetry && (
                <Button variant="outline" onClick={onRetry}>
                    Retry
                </Button>
            )}
        </div>
    );
};

export default InlineAlert;

