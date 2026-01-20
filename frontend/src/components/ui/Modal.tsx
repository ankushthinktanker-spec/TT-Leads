import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    onClose: () => void;
    className?: string;
}

const Modal = ({ title, children, footer, onClose, className }: ModalProps) => {
    return (
        <div className="modal-overlay">
            <div className={cn('modal-panel', className)}>
                <div className="modal-header">
                    <h2 className="text-xl font-semibold text-secondary-50">{title}</h2>
                    <button onClick={onClose} className="icon-button" aria-label="Close">
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
};

export default Modal;
