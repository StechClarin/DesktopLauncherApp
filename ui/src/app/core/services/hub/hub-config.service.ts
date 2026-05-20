import { Injectable, inject } from '@angular/core';
import { HubStateService } from './hub-state.service';
import { HubDataService } from './hub-data.service';
import { ToastService } from '../toast.service';
import { DbConfig } from '../../models/hub.models';
import { invoke } from '@tauri-apps/api/core';

@Injectable({
    providedIn: 'root'
})
export class HubConfigService {
    private state = inject(HubStateService);
    private data = inject(HubDataService);
    private toast = inject(ToastService);

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

    toggleOfflineMode() {
        const newVal = !this.state.isOffline();
        this.state.isOffline.set(newVal);
        localStorage.setItem('hub-offline-mode', String(newVal));
        this.toast.show('info', newVal ? 'Mode Hors-ligne activé' : 'Mode En-ligne activé');
        if (!newVal) {
            this.data.init(); // Re-trigger online fetch
        } else {
            this.data.loadOfflineData();
        }
    }
}
