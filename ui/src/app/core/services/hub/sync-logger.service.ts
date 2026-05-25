import { Injectable, signal } from '@angular/core';

export interface SyncLog {
    id: string;
    type: 'PULL' | 'PUSH' | 'ERROR' | 'INFO' | 'SUCCESS';
    message: string;
    payload?: any;
    timestamp: Date;
    appId?: string;
}

@Injectable({
    providedIn: 'root'
})
export class SyncLoggerService {
    logs = signal<SyncLog[]>([]);
    isOpen = signal<boolean>(false);

    toggleDrawer() {
        this.isOpen.update(v => !v);
    }

    openDrawer() {
        this.isOpen.set(true);
    }

    closeDrawer() {
        this.isOpen.set(false);
    }

    private addLog(log: Omit<SyncLog, 'id' | 'timestamp'>) {
        const newLog: SyncLog = {
            ...log,
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date()
        };
        // Keep last 100 logs
        this.logs.update(logs => [newLog, ...logs].slice(0, 100));
    }

    logInfo(message: string, appId?: string, payload?: any) {
        this.addLog({ type: 'INFO', message, appId, payload });
        console.log(`[SYNC INFO] ${message}`, payload || '');
    }

    logSuccess(message: string, appId?: string, payload?: any) {
        this.addLog({ type: 'SUCCESS', message, appId, payload });
        console.log(`[SYNC SUCCESS] ${message}`, payload || '');
    }

    logError(message: string, appId?: string, payload?: any) {
        this.addLog({ type: 'ERROR', message, appId, payload });
        console.error(`[SYNC ERROR] ${message}`, payload || '');
    }

    logPull(message: string, payload: any, appId?: string) {
        this.addLog({ type: 'PULL', message, payload, appId });
        console.log(`[SYNC PULL] ${message}`, payload);
    }

    logPush(message: string, payload: any, appId?: string) {
        this.addLog({ type: 'PUSH', message, payload, appId });
        console.log(`[SYNC PUSH] ${message}`, payload);
    }

    clearLogs() {
        this.logs.set([]);
    }
}
