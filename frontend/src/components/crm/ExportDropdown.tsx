import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, Sheet } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFloatingMenu } from '../ui/useFloatingMenu';

export type ExportType = 'pdf' | 'excel';

interface ExportDropdownProps {
    onExport: (type: ExportType) => void;
    className?: string;
}

const ExportDropdown = ({ onExport, className }: ExportDropdownProps) => {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const { floatingStyle, updatePosition } = useFloatingMenu({
        open,
        triggerRef,
        menuRef,
        gap: 6,
        minWidth: 176,
        maxHeight: 240,
    });

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

    const handleExport = (type: ExportType) => {
        onExport(type);
        setOpen(false);
        triggerRef.current?.focus();
    };

    return (
        <div className={cn('relative', className)}>
            <button
                ref={triggerRef}
                type="button"
                className="btn btn-outline flex items-center gap-2"
                onClick={() => setOpen((prev) => !prev)}
            >
                <Download className="w-4 h-4" />
                Export
            </button>
            {open && typeof document !== 'undefined' && createPortal(
                <div
                    ref={menuRef}
                    className={cn('rounded-lg z-[9999] bg-[#fffaf4] border border-slate-200 shadow-[0_12px_30px_rgba(120,74,24,0.12)] overflow-hidden')}
                    style={floatingStyle}
                >
                    <button
                        type="button"
                        onClick={() => handleExport('pdf')}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-[#fbf2e7]"
                    >
                        <FileText className="w-4 h-4" />
                        Export PDF
                    </button>
                    <button
                        type="button"
                        onClick={() => handleExport('excel')}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-[#fbf2e7]"
                    >
                        <Sheet className="w-4 h-4" />
                        Export Excel
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ExportDropdown;


