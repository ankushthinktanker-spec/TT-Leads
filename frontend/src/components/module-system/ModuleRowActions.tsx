import { ReactNode, useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';

export interface DropdownAction {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    danger?: boolean;
    divider?: boolean;
}

interface ModuleRowActionsProps {
    /** Primary quick action rendered as a visible button */
    primaryAction?: {
        icon: ReactNode;
        label: string;
        onClick: () => void;
        variant?: 'primary' | 'danger';
    };
    /** Overflow dropdown menu items */
    actions: DropdownAction[];
}

const ModuleRowActions = ({ primaryAction, actions }: ModuleRowActionsProps) => {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div className="mod-row-actions" onClick={(e) => e.stopPropagation()}>
            {primaryAction && (
                <button
                    className={`mod-row-actions__btn mod-row-actions__btn--${primaryAction.variant || 'primary'}`}
                    title={primaryAction.label}
                    onClick={primaryAction.onClick}
                >
                    {primaryAction.icon}
                </button>
            )}

            {actions.length > 0 && (
                <div className="mod-row-actions__menu" ref={menuRef}>
                    <button
                        className="mod-row-actions__btn"
                        onClick={() => setOpen(!open)}
                        title="More actions"
                    >
                        <MoreHorizontal size={15} />
                    </button>

                    {open && (
                        <div className="mod-row-actions__dropdown">
                            {actions.map((action, i) => (
                                <div key={i}>
                                    {action.divider && <div className="mod-row-actions__dropdown-divider" />}
                                    <button
                                        className={`mod-row-actions__dropdown-item ${action.danger ? 'mod-row-actions__dropdown-item--danger' : ''}`}
                                        onClick={() => {
                                            setOpen(false);
                                            action.onClick();
                                        }}
                                    >
                                        {action.icon}
                                        {action.label}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ModuleRowActions;
