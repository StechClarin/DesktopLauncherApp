import { Injectable, inject } from '@angular/core';
import { HubStateService } from './hub-state.service';
import { HubDataService } from './hub-data.service';
import { ToastService } from '../toast.service';
import { DbConfig } from '../../models/hub.models';
import { invoke } from '@tauri-apps/api/core';
import { HubSyncService } from './hub-sync.service';

@Injectable({
    providedIn: 'root'
})
export class HubConfigService {
    private state = inject(HubStateService);
    private data = inject(HubDataService);
    private toast = inject(ToastService);
    private sync = inject(HubSyncService);

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                if (this.state.isOffline()) {
                    this.changeOfflineMode(false, false);
                }
            });
            window.addEventListener('offline', () => {
                if (!this.state.isOffline()) {
                    this.changeOfflineMode(true, false);
                }
            });

            // Initial check on startup
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                setTimeout(() => {
                    if (!this.state.isOffline()) {
                        this.changeOfflineMode(true, false);
                    }
                }, 100);
            }
        }
    }

    async loadDbConfig(appId: string): Promise<DbConfig | null> {
        if (!(window as any).__TAURI_INTERNALS__) return null;
        try {
            const config = await invoke<DbConfig | null>('get_db_config', { appId });
            return config;
        } catch (e) { 
            console.error(`Failed to load DB config for ${appId}`, e); 
            return null;
        }
    }

    async saveDbConfig(appId: string, config: DbConfig) {
        try {
            await invoke('save_db_config', { appId, config });
            this.toast.success('Configuration DB sauvegardée !');
        } catch (e) {
            this.toast.error('Échec de la sauvegarde.');
            throw e;
        }
    }

    async testDbConnection(config: DbConfig): Promise<string> {
        try {
            const result = await invoke<string>('test_db_connection', { config });
            this.toast.success('Connexion établie !');
            return result;
        } catch (e: any) {
            this.toast.error('Erreur de connexion DB.');
            throw e;
        }
    }

    async changeOfflineMode(offline: boolean, manual: boolean) {
        if (!offline && typeof navigator !== 'undefined' && !navigator.onLine) {
            this.toast.error("Veuillez vous connecter à un réseau.");
            return;
        }

        this.state.isOffline.set(offline);
        localStorage.setItem('hub-offline-mode', String(offline));

        if (manual) {
            this.toast.show('info', offline ? 'Mode Hors-ligne activé' : 'Mode En-ligne activé');
        } else {
            this.toast.show('info', offline ? 'Réseau déconnecté : Mode Hors-ligne' : 'Réseau détecté : Mode En-ligne');
        }

        if (!offline) {
            await this.data.init();
            
            // Sequential sync of only physically installed apps (status === 'installed')
            const apps = this.state.installedApps().filter(app => app.status === 'installed');
            if (apps.length > 0) {
                this.toast.info("Début de la synchronisation séquentielle...");
                for (const app of apps) {
                    try {
                        await this.sync.executeDeepSync(app.id);
                    } catch (e) {
                        console.error(`Failed to sync app ${app.name || app.id} sequentially:`, e);
                    }
                }
            }
        } else {
            this.data.loadOfflineData();
        }
    }

    toggleOfflineMode() {
        const currentOffline = this.state.isOffline();
        this.changeOfflineMode(!currentOffline, true);
    }
}
