import { createContext, useContext, useMemo, useState } from 'react';

type GlobalSearchContextValue = {
    value: string;
    setValue: (next: string) => void;
    clear: () => void;
};

const GlobalSearchContext = createContext<GlobalSearchContextValue | undefined>(undefined);

export const GlobalSearchProvider = ({ children }: { children: React.ReactNode }) => {
    const [value, setValue] = useState('');

    const contextValue = useMemo(
        () => ({
            value,
            setValue,
            clear: () => setValue('')
        }),
        [value]
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
