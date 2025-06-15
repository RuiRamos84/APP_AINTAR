// frontend/src/pages/Operation/services/notificationService.js
import { toast } from 'react-hot-toast';

class NotificationService {
    loading(promise, loadingText = 'A processar...', successText = 'Concluído!', errorText = 'Erro!') {
        return toast.promise(
            promise,
            {
                loading: loadingText,
                success: successText,
                error: (err) => err?.message || errorText
            },
            {
                style: { minWidth: '250px' },
                success: { duration: 3000 },
                error: { duration: 5000 }
            }
        );
    }

    success(message, options = {}) {
        return toast.success(message, {
            duration: 3000,
            position: 'top-right',
            ...options
        });
    }

    error(message, options = {}) {
        return toast.error(message, {
            duration: 5000,
            position: 'top-right',
            ...options
        });
    }

    warning(message, options = {}) {
        return toast(message, {
            icon: '⚠️',
            duration: 4000,
            position: 'top-right',
            ...options
        });
    }

    info(message, options = {}) {
        return toast(message, {
            icon: 'ℹ️',
            duration: 3000,
            position: 'top-right',
            ...options
        });
    }
}

export const notification = new NotificationService();