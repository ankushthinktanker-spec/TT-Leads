import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import Button from './Button';

interface InlineErrorProps {
    message: ReactNode;
    onRetry?: () => void;
    className?: string;
}

const InlineError = ({ message, onRetry, className }: InlineErrorProps) => {
    return (
        <div className={cn('flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm', className)}>
            <div>{message}</div>
            {onRetry && (
                <Button variant="outline" onClick={onRetry}>
                    Retry
                </Button>
            )}
        </div>
    );
};

export default InlineError;

