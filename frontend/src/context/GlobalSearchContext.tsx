import { createContext, useContext, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '../routes';

type SearchScope = {
    key: string;
    enabled: boolean;
    label: string;
    placeholder: string;
};

const SEARCH_SCOPES: SearchScope[] = [
    { key: ROUTES.leads, enabled: true, label: 'Lead Search', placeholder: 'Search leads, company, email...' },
    { key: ROUTES.companies, enabled: true, label: 'Company Search', placeholder: 'Search companies, websites, contacts...' },
    { key: ROUTES.contacts, enabled: true, label: 'Contact Search', placeholder: 'Search contacts, email, company...' },
    { key: ROUTES.proposals, enabled: true, label: 'Proposal Search', placeholder: 'Search proposals...' },
    { key: ROUTES.subscriptions, enabled: true, label: 'Subscription Search', placeholder: 'Search subscriptions, vendors, plans...' },
    { key: ROUTES.users, enabled: true, label: 'User Search', placeholder: 'Search users...' },
];

const defaultScope: SearchScope = {
    key: 'disabled',
    enabled: false,
    label: 'Page Search',
    placeholder: 'Page search is not available here',
};

export const resolveSearchScope = (pathname: string): SearchScope =>
    SEARCH_SCOPES.find((scope) => scope.key === pathname) ?? defaultScope;

type GlobalSearchContextValue = {
    scope: SearchScope;
    value: string;
    setValue: (next: string) => void;
    clear: () => void;
};

const GlobalSearchContext = createContext<GlobalSearchContextValue | undefined>(undefined);

export const GlobalSearchProvider = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();
    const [valuesByScope, setValuesByScope] = useState<Record<string, string>>({});
    const scope = resolveSearchScope(location.pathname);
    const value = scope.enabled ? (valuesByScope[scope.key] ?? '') : '';

    const contextValue = useMemo(
        () => ({
            scope,
            value,
            setValue: (next: string) => {
                if (!scope.enabled) return;
                setValuesByScope((current) => ({ ...current, [scope.key]: next }));
            },
            clear: () => {
                if (!scope.enabled) return;
                setValuesByScope((current) => ({ ...current, [scope.key]: '' }));
            }
        }),
        [scope, value]
    );

    return (
        <GlobalSearchContext.Provider value={contextValue}>
            {children}
        </GlobalSearchContext.Provider>
    );
};

export const useGlobalSearch = () => {
    const context = useContext(GlobalSearchContext);
    if (!context) {
        throw new Error('useGlobalSearch must be used within GlobalSearchProvider');
    }
    return context;
};
