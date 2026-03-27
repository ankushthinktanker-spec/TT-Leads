import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: ReactNode;
    label: string;
}

const IconButton = ({ icon, label, className, ...props }: IconButtonProps) => {
    return (
        <button
            type="button"
            className={cn('tt-icon-button', className)}
            aria-label={label}
            title={label}
            {...props}
        >
            {icon}
        </button>
    );
};

export default IconButton;
