import { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

const getToastClasses = (type: ToastType) => {
    if (type === 'success') return 'toast toast-success';
    if (type === 'error') return 'toast toast-error';
    return 'toast toast-info';
};

const ToastContainer = () => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent).detail as { message: string; type: ToastType };
            const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            setToasts((prev) => [...prev, { id, message: detail.message, type: detail.type }]);
            setTimeout(() => {
                setToasts((prev) => prev.filter((toast) => toast.id !== id));
            }, 3000);
        };
        window.addEventListener('app:toast', handler);
        return () => window.removeEventListener('app:toast', handler);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <div key={toast.id} className={getToastClasses(toast.type)}>
                    {toast.message}
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
