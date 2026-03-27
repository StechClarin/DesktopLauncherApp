import { Injectable, signal } from '@angular/core';

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    toasts = signal<Toast[]>([]);

    show(type: 'success' | 'error' | 'info', message: string, duration = 3000) {
        const id = Math.random().toString(36).substring(2, 9);
        this.toasts.update(current => [...current, { id, type, message }]);

        setTimeout(() => {
            this.remove(id);
        }, duration);
    }

    success(message: string, duration = 3000) {
        this.show('success', message, duration);
    }

    error(message: string, duration = 4000) {
        this.show('error', message, duration);
    }

    info(message: string, duration = 3000) {
        this.show('info', message, duration);
    }

    remove(id: string) {
        this.toasts.update(current => current.filter(t => t.id !== id));
    }
}
