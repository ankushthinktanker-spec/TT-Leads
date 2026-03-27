import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
}

const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirm' }: ConfirmDialogProps) => {
    if (!open) return null;

    return (
        <Modal
            title={title}
            onClose={onCancel}
            footer={(
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
                </div>
            )}
        >
            <p className="text-sm text-slate-600">{message}</p>
        </Modal>
    );
};

export default ConfirmDialog;

