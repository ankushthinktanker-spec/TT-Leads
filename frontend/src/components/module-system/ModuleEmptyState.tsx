import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface ModuleEmptyStateProps {
    icon?: ReactNode;
    title?: string;
    description?: string;
    action?: ReactNode;
}

const ModuleEmptyState = ({
    icon,
    title = 'No results found',
    description = 'Try adjusting your filters or search terms.',
    action,
}: ModuleEmptyStateProps) => (
    <div className="mod-empty-state">
        <div className="mod-empty-state__icon">
            {icon || <Inbox size={28} />}
        </div>
        <div className="mod-empty-state__title">{title}</div>
        <div className="mod-empty-state__description">{description}</div>
        {action && <div className="mod-empty-state__action">{action}</div>}
    </div>
);

export default ModuleEmptyState;
