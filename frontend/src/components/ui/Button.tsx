import { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
}

const Button = ({ variant = 'primary', className, ...props }: ButtonProps) => {
    const variantClass = {
        primary: 'btn btn-primary',
        secondary: 'btn btn-secondary',
        ghost: 'btn btn-ghost',
        outline: 'btn btn-outline',
        danger: 'btn btn-danger'
    }[variant];

    return <button className={cn(variantClass, className)} {...props} />;
};

export default Button;
