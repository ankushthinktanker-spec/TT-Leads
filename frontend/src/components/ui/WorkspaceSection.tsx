import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface WorkspaceSectionProps {
    title: string;
    description?: string;
    eyebrow?: string;
    aside?: ReactNode;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
}

const WorkspaceSection = ({
    title,
    description,
    eyebrow,
    aside,
    children,
    className,
    contentClassName
}: WorkspaceSectionProps) => {
    return (
        <section className={cn('workspace-section', className)}>
            <div className="workspace-section__header">
                <div className="min-w-0">
                    {eyebrow && <div className="workspace-section__eyebrow">{eyebrow}</div>}
                    <h2 className="workspace-section__title">{title}</h2>
                    {description && <p className="workspace-section__description">{description}</p>}
                </div>
                {aside && <div className="workspace-section__aside">{aside}</div>}
            </div>
            <div className={cn('workspace-section__content', contentClassName)}>{children}</div>
        </section>
    );
};

export default WorkspaceSection;
