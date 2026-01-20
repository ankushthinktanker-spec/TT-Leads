import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PageLayoutProps {
    children: ReactNode;
    className?: string;
}

const PageLayout = ({ children, className }: PageLayoutProps) => {
    return <div className={cn('page-layout', className)}>{children}</div>;
};

export default PageLayout;
