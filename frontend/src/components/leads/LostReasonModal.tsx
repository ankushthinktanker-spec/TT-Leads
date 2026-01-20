import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FormLabel, TextareaInput, ErrorText } from '../ui/Form';

interface LostReasonModalProps {
    isOpen: boolean;
    initialReason?: string;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

const LostReasonModal = ({ isOpen, initialReason = '', onClose, onConfirm }: LostReasonModalProps) => {
    const [reason, setReason] = useState(initialReason);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setReason(initialReason);
            setError('');
        }
    }, [initialReason, isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!reason.trim()) {
            setError('Lost reason is required.');
            return;
        }
        onConfirm(reason.trim());
        setReason('');
        setError('');
    };

    const handleClose = () => {
        setReason('');
        setError('');
        onClose();
    };

    return (
        <Modal
            title="Lost Reason"
            onClose={handleClose}
            className="max-w-md"
            footer={(
                <>
                    <Button type="button" onClick={handleClose} variant="outline">
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleConfirm} variant="primary">
                        Confirm Loss
                    </Button>
                </>
            )}
        >
            <div className="space-y-4">
                <div>
                    <FormLabel>
                        Why was the lead lost? <span className="text-red-500">*</span>
                    </FormLabel>
                    <TextareaInput
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                        placeholder="Add the primary reason for loss..."
                    />
                    {error && <ErrorText>{error}</ErrorText>}
                </div>
            </div>
        </Modal>
    );
};

export default LostReasonModal;
