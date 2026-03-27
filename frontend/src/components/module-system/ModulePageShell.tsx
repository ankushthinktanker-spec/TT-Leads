import { ReactNode } from 'react';

interface ModulePageShellProps {
    children: ReactNode;
    className?: string;
}

/**
 * Module page shell — wraps entire module page content with consistent
 * max-width, padding, and spacing. Every module page should use this.
 */
const ModulePageShell = ({ children, className = '' }: ModulePageShellProps) => (
    <div className={`mod-page ${className}`}>
        {children}
    </div>
);

export default ModulePageShell;
