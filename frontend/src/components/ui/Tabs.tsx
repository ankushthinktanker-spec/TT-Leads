import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface TabItem {
    id: string;
    label: string;
    badge?: string | number;
}

interface TabsProps {
    tabs: TabItem[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

const Tabs = ({ tabs, value, onChange, className }: TabsProps) => {
    return (
        <div className={cn('flex flex-wrap gap-2 border-b border-slate-200 pb-2', className)} role="tablist">
            {tabs.map((tab) => {
                const isActive = tab.id === value;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={cn(
                            'min-h-11 rounded-lg px-3 text-sm font-medium transition-colors focus:ring-2 focus:ring-brand-500/20 focus:outline-none',
                            isActive ? 'bg-brand-500/10 text-brand-600' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        )}
                        onClick={() => onChange(tab.id)}
                    >
                        <span>{tab.label}</span>
                        {tab.badge !== undefined && (
                            <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">{tab.badge}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export const TabPanel = ({ children }: { children: ReactNode }) => (
    <div role="tabpanel" className="pt-4">{children}</div>
);

export default Tabs;

