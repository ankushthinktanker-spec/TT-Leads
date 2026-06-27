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
        primary: 'btn btn-primary',
        secondary: 'btn btn-secondary',
        ghost: 'btn btn-ghost',
        outline: 'btn btn-outline',
        danger: 'btn btn-danger'
    }[variant];

    const sizeClass = {
        sm: 'btn-sm',
        md: '',
        lg: 'btn-lg',
        icon: 'btn-icon'
    }[size];

    return <button className={cn(variantClass, sizeClass, className)} {...props} />;
};

export default Button;
