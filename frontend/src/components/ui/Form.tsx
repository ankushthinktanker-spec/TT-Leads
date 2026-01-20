import { forwardRef, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface FormTextProps {
    children: ReactNode;
    className?: string;
}

export const FormLabel = ({ children, className }: FormTextProps) => (
    <label className={cn('form-label', className)}>{children}</label>
);

export const HelperText = ({ children, className }: FormTextProps) => (
    <p className={cn('form-helper', className)}>{children}</p>
);

export const ErrorText = ({ children, className }: FormTextProps) => (
    <p className={cn('form-error', className)}>{children}</p>
);

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => (
        <input ref={ref} className={cn('input', className)} {...props} />
    )
);
TextInput.displayName = 'TextInput';

export const SelectInput = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
    ({ className, ...props }, ref) => (
        <select ref={ref} className={cn('input', className)} {...props} />
    )
);
SelectInput.displayName = 'SelectInput';

export const TextareaInput = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
    ({ className, ...props }, ref) => (
        <textarea ref={ref} className={cn('input', className)} {...props} />
    )
);
TextareaInput.displayName = 'TextareaInput';
