type ToastType = 'success' | 'error' | 'info';

export const showToast = (message: string, type: ToastType = 'info') => {
    window.dispatchEvent(new CustomEvent('app:toast', {
        detail: {
            message,
            type
        }
    }));
};
