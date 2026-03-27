import { cn } from '../../lib/utils';

interface SkeletonProps {
    className?: string;
}

const Skeleton = ({ className }: SkeletonProps) => {
    return <div className={cn('tt-skeleton', className)} />;
};

export default Skeleton;
