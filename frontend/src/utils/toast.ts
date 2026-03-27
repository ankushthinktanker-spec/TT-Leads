import { shouldShowToast } from '../components/ui/ToastDedupe';

type ToastType = 'success' | 'error' | 'info';

export const showToast = (message: string, type: ToastType = 'info') => {
    if (!shouldShowToast(message, type, 10000)) {
        return;
    }
    window.dispatchEvent(new CustomEvent('app:toast', {
        detail: {
            message,
            type
        }
    }));
};
