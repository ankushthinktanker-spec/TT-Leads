import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
    title: string;
    subtitle?: ReactNode;
    actions?: ReactNode;
    className?: string;
}

const PageHeader = ({ title, subtitle, actions, className }: PageHeaderProps) => {
    return (
        <div className={cn('page-header', className)}>
            <div>
                <h1 className="page-title">{title}</h1>
                {subtitle && <div className="page-subtitle">{subtitle}</div>}
            </div>
            {actions && <div className="page-actions">{actions}</div>}
        </div>
    );
};

export default PageHeader;
