import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface SurfaceCardProps {
    children: ReactNode;
    className?: string;
}

const SurfaceCard = ({ children, className }: SurfaceCardProps) => {
    return <div className={cn('surface-card', className)}>{children}</div>;
};

export default SurfaceCard;
