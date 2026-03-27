import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { uiTokens } from '../../theme/uiTokens';

interface SurfaceCardProps {
    children: ReactNode;
    className?: string;
}

const SurfaceCard = ({ children, className }: SurfaceCardProps) => {
    return <div className={cn('workspace-sheet p-6', uiTokens.card, className)}>{children}</div>;
};

export default SurfaceCard;
