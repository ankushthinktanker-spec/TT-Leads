import { type ReactNode, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useAccessibleOverlay } from './useAccessibleOverlay';

interface DrawerProps {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
}

const Drawer = ({ open, title, onClose, children, footer }: DrawerProps) => {
    const drawerRef = useRef<HTMLElement>(null);
    const titleId = useId();

    useAccessibleOverlay({
        open,
        onClose,
        containerRef: drawerRef,
    });

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/28 backdrop-blur-[3px]" onMouseDown={onClose}>
            <aside
                ref={drawerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                onMouseDown={(event) => event.stopPropagation()}
                className="h-full w-full max-w-md border-l border-slate-200 bg-[linear-gradient(180deg,#fffdf9_0%,#f8eee3_100%)] shadow-[0_24px_80px_rgba(120,74,24,0.15)]"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-5">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace panel</div>
                        <h2 id={titleId} className="mt-2 text-[20px] font-bold tracking-tight text-slate-950">{title}</h2>
                    </div>
                    <button type="button" aria-label="Close panel" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-[#fffdf9] text-slate-500 transition hover:border-slate-300 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-500/10">
                        <X size={18} />
                    </button>
                </header>
                <div className="h-[calc(100%-144px)] overflow-y-auto px-5 py-5">{children}</div>
                {footer && <footer className="border-t border-slate-200/80 bg-[#fff7ee]/88 px-5 py-4">{footer}</footer>}
            </aside>
        </div>
    );
};

export default Drawer;
