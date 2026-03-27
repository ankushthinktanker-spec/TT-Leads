import { ReactNode } from 'react';

interface ModulePageHeaderProps {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: ReactNode;
}

const ModulePageHeader = ({ eyebrow, title, description, actions }: ModulePageHeaderProps) => (
    <div className="mod-header mod-animate-in">
        <div className="mod-header__left">
            {eyebrow && (
                <div className="mod-header__eyebrow">
                    <span className="mod-header__eyebrow-dot" />
                    {eyebrow}
                </div>
            )}
            <h1 className="mod-header__title">{title}</h1>
            {description && <p className="mod-header__description">{description}</p>}
        </div>
        {actions && <div className="mod-header__actions">{actions}</div>}
    </div>
);

export default ModulePageHeader;
