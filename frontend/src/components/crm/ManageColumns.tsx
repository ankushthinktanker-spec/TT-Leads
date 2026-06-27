import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Columns3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFloatingMenu } from '../ui/useFloatingMenu';

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
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const defaultVisible = useMemo(
        () => columns.filter((col) => col.alwaysVisible !== false).map((col) => col.id),
        [columns]
    );
    const [visibleIds, setVisibleIds] = useState<string[]>(defaultVisible);
    const { floatingStyle, updatePosition } = useFloatingMenu({
        open,
        triggerRef,
        menuRef,
        gap: 6,
        minWidth: 208,
        maxHeight: 320,
    });

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

    useEffect(() => {
        if (!open) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedTrigger = triggerRef.current?.contains(target);
            const clickedMenu = menuRef.current?.contains(target);
            if (!clickedTrigger && !clickedMenu) {
                setOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
                triggerRef.current?.focus();
            }
        };

        const frame = window.requestAnimationFrame(() => updatePosition());

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            window.cancelAnimationFrame(frame);
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, updatePosition]);

    const toggleColumn = (id: string) => {
        const column = columns.find((col) => col.id === id);
        if (column?.alwaysVisible) return;
        setVisibleIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    return (
        <div className={cn('relative', className)}>
            <button
                ref={triggerRef}
                type="button"
                className="btn btn-outline flex items-center gap-2"
                onClick={() => setOpen((prev) => !prev)}
            >
                <Columns3 className="w-4 h-4" />
                Columns
            </button>
            {open && typeof document !== 'undefined' && createPortal(
                <div
                    ref={menuRef}
                    className={cn('rounded-lg border z-[9999] bg-[#fffaf4] border-slate-200 shadow-[0_12px_30px_rgba(120,74,24,0.12)] overflow-hidden')}
                    style={floatingStyle}
                >
                    <div className={cn('border-b border-slate-200 px-4 py-3 text-xs uppercase tracking-widest text-slate-500 bg-[#fbf2e7]/70')}>
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
                </div>,
                document.body
            )}
        </div>
    );
};

export default ManageColumns;



