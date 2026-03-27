import { useEffect, useMemo, useState } from 'react';
import { Columns3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { border, shadowCard, surfaceCard, textMuted } from '../../theme/tokens';

export type ColumnOption = {
    id: string;
    label: string;
    alwaysVisible?: boolean;
};

interface ManageColumnsProps {
    storageKey: string;
    columns: ColumnOption[];
    onChange?: (visibleIds: string[]) => void;
    className?: string;
}

const ManageColumns = ({ storageKey, columns, onChange, className }: ManageColumnsProps) => {
    const [open, setOpen] = useState(false);
    const defaultVisible = useMemo(
        () => columns.filter((col) => col.alwaysVisible !== false).map((col) => col.id),
        [columns]
    );
    const [visibleIds, setVisibleIds] = useState<string[]>(defaultVisible);

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as string[];
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setVisibleIds(parsed);
                    return;
                }
            } catch {
                // ignore invalid storage
            }
        }
        setVisibleIds(defaultVisible);
    }, [defaultVisible, storageKey]);

    useEffect(() => {
        const normalized = Array.from(new Set([...visibleIds, ...columns.filter((c) => c.alwaysVisible).map((c) => c.id)]));
        setVisibleIds((prev) => (prev.join('|') === normalized.join('|') ? prev : normalized));
    }, [columns, visibleIds]);

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(visibleIds));
        onChange?.(visibleIds);
    }, [visibleIds, storageKey, onChange]);

    const toggleColumn = (id: string) => {
        const column = columns.find((col) => col.id === id);
        if (column?.alwaysVisible) return;
        setVisibleIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    return (
        <div className={cn('relative', className)}>
            <button
                type="button"
                className="btn btn-outline flex items-center gap-2"
                onClick={() => setOpen((prev) => !prev)}
            >
                <Columns3 className="w-4 h-4" />
                Columns
            </button>
            {open && (
                <div className={cn('absolute right-0 mt-2 w-52 rounded-lg border z-20', surfaceCard, border, shadowCard)}>
                    <div className={cn('px-4 py-3 border-b text-xs uppercase tracking-widest', border, textMuted)}>
                        Manage Columns
                    </div>
                    <div className="p-3 space-y-2">
                        {columns.map((column) => (
                            <label key={column.id} className="flex items-center gap-2 text-sm text-slate-900">
                                <input
                                    type="checkbox"
                                    checked={visibleIds.includes(column.id)}
                                    disabled={column.alwaysVisible}
                                    onChange={() => toggleColumn(column.id)}
                                />
                                {column.label}
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageColumns;


