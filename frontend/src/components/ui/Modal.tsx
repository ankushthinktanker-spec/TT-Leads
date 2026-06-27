import { ReactNode, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAccessibleOverlay } from './useAccessibleOverlay';

interface ModalProps {
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    onClose: () => void;
    className?: string;
}

const Modal = ({ title, children, footer, onClose, className }: ModalProps) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const titleId = useId();

    useAccessibleOverlay({
        open: true,
        onClose,
        containerRef: modalRef,
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-[3px]" onMouseDown={onClose}>
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                onMouseDown={(event) => event.stopPropagation()}
                className={cn('w-full max-w-3xl overflow-hidden rounded-[24px] border border-slate-200 bg-[#fffaf4] shadow-[0_24px_80px_rgba(120,74,24,0.16)]', className)}
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-[linear-gradient(180deg,#fffdf9_0%,#fbf2e7_100%)] px-6 py-5">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace form</div>
                        <h2 id={titleId} className="mt-2 text-[22px] font-bold tracking-tight text-slate-950">{title}</h2>
                    </div>
                    <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-[#fffdf9] text-slate-500 transition hover:border-slate-300 hover:text-slate-700" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
                {footer && <div className="border-t border-slate-200/80 bg-[#fbf2e7]/80 px-6 py-4">{footer}</div>}
            </div>
        </div>
    );
};

export default Modal;
