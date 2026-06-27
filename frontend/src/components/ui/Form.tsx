import { forwardRef, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface FormTextProps {
    children: ReactNode;
    className?: string;
}

export const FormLabel = ({ children, className }: FormTextProps) => (
    <label className={cn('mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500', className)}>{children}</label>
);

export const HelperText = ({ children, className }: FormTextProps) => (
    <p className={cn('mt-1 text-xs leading-5 text-slate-500', className)}>{children}</p>
);

export const ErrorText = ({ children, className }: FormTextProps) => (
    <p className={cn('mt-1 text-xs font-medium leading-5 text-rose-600', className)}>{children}</p>
);

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => (
        <input
            ref={ref}
            className={cn(
                'h-10 w-full rounded-xl border border-slate-200 bg-[#fffdf9] px-3 text-sm font-medium text-slate-800 shadow-[0_4px_12px_rgba(120,74,24,0.03)] outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10',
                className
            )}
            {...props}
        />
    )
);
TextInput.displayName = 'TextInput';

export const SelectInput = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
    ({ className, ...props }, ref) => (
        <select
            ref={ref}
            className={cn(
                'h-10 w-full rounded-xl border border-slate-200 bg-[#fffdf9] px-3 text-sm font-medium text-slate-800 shadow-[0_4px_12px_rgba(120,74,24,0.03)] outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10',
                className
            )}
            {...props}
        />
    )
);
SelectInput.displayName = 'SelectInput';

export const TextareaInput = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
    ({ className, ...props }, ref) => (
        <textarea
            ref={ref}
            className={cn(
                'min-h-[112px] w-full rounded-xl border border-slate-200 bg-[#fffdf9] px-3 py-2.5 text-sm font-medium text-slate-800 shadow-[0_4px_12px_rgba(120,74,24,0.03)] outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10',
                className
            )}
            {...props}
        />
    )
);
TextareaInput.displayName = 'TextareaInput';
