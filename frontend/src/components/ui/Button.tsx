import { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

const Button = ({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) => {
    const variantClass = {
        primary: 'inline-flex items-center justify-center gap-2 rounded-xl border border-transparent bg-[#335CFF] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(51,92,255,0.24)] transition hover:bg-[#2649D8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#335CFF]/15 disabled:cursor-not-allowed disabled:opacity-50',
        secondary: 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-[0_6px_18px_rgba(15,23,42,0.03)] transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#335CFF]/12 disabled:cursor-not-allowed disabled:opacity-50',
        ghost: 'inline-flex items-center justify-center gap-2 rounded-xl border border-transparent bg-transparent px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#335CFF]/10 disabled:cursor-not-allowed disabled:opacity-50',
        outline: 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-transparent px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#335CFF]/10 disabled:cursor-not-allowed disabled:opacity-50',
        danger: 'inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/12 disabled:cursor-not-allowed disabled:opacity-50'
    }[variant];

    const sizeClass = {
        sm: 'h-9 px-3 text-[13px]',
        md: 'h-10',
        lg: 'h-11 px-5',
        icon: 'h-10 w-10 px-0'
    }[size];

    return <button className={cn(variantClass, sizeClass, className)} {...props} />;
};

export default Button;
