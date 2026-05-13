import { Injectable, inject } from '@angular/core';
import { HubStateService } from './hub-state.service';
import { HubDataService } from './hub-data.service';
import { HubNavigationService } from './hub-navigation.service';
import { SupabaseService } from '../supabase.service';
import { ToastService } from '../toast.service';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

@Injectable({
    providedIn: 'root'
})
export class HubInstallerService {
    private state = inject(HubStateService);
    private data = inject(HubDataService);
    private navigation = inject(HubNavigationService);
    private supabase = inject(SupabaseService);
    private toast = inject(ToastService);

    constructor() {
        this.initProgressListeners();
    }

    private async initProgressListeners() {
        await listen('download-progress', (event: any) => {
            const { app_id, progress } = event.payload;
            if (this.state.downloadingAppId() === app_id) {
                this.state.installProgress.set(progress);
            }
        });

        await listen('hub-update-progress', (event: any) => {
            this.state.hubUpdateProgress.set(event.payload as number);
        });

        await listen('hub-app-status-changed', async (event: any) => {
            const { app_id, status } = event.payload;
            console.log(`[HUB_EVENT] App ${app_id} changed to ${status}`);
            if (status === 'installed' || status === 'uninstalled') {
                await this.data.init(); // Refresh everything
            }
        });
    }

    private getOsKeyword(): string {
        return navigator.userAgent.toLowerCase().includes('win') ? 'windows-latest' : 'ubuntu-latest';
    }

    async installApp(appId: string) {
        if (this.state.downloadingAppId()) return;

        try {
            this.state.downloadingAppId.set(appId);
            this.state.installProgress.set(0);

            const platform = this.getOsKeyword();
            const { data: release, error } = await this.supabase.client
                .from('app_releases')
                .select('version, download_url, checksum')
                .eq('app_id', appId)
                .eq('platform', platform)
                .order('released_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !release) {
                this.toast.error("Version introuvable pour votre plateforme.");
                this.state.downloadingAppId.set(null);
                return;
            }

            this.toast.info(`Étape 1/3 : Téléchargement de ${appId}...`);
            await invoke('download_app', { appId, url: release.download_url, checksum: release.checksum });
            
            const config = this.state.dbConfig();
            if (config) {
                this.state.installProgress.set(101);
                this.toast.info(`Étape 2/3 : Création de la base SQL...`);
                await invoke('initialize_database', { config, appId });
                
                this.state.installProgress.set(102);
                this.toast.info(`Étape 3/3 : Initialisation finale...`);
                
                const tenantId = this.state.hubId();
                if (!tenantId) throw new Error("Hub ID manquant.");

                await invoke('run_app_setup', { appId, tenantId, config });
                this.toast.success(`Installation terminée !`);
            }
            
            this.finalizeInstallation(appId, release.version);
        } catch (err: any) {
            if (err === 'Download aborted' || (typeof err === 'string' && err.includes('aborted'))) return;
            this.toast.error(`Échec de l'installation : ${err}`);
            this.state.downloadingAppId.set(null);
        }
    }

    async uninstallApp(appId: string) {
        const app = [...this.state.installedApps(), ...this.state.availableApps()].find(a => a.id === appId);
        if (!app) return;

        try {
            this.state.isLoading.set(true);
            this.toast.info(`Arrêt de ${app.name} avant désinstallation...`);
            await this.navigation.closeTab(appId); 
            
            this.toast.info(`Désinstallation de ${app.name}...`);
            const config = this.state.dbConfig() || { host:'', port:0, user:'', pass:'' };
            await invoke('uninstall_app', { config, appId });

            await this.data.init(); // Refresh UI
            this.toast.success(`${app.name} a été supprimée.`);
        } catch (e) {
            this.toast.error(`Erreur de désinstallation : ${e}`);
        } finally {
            this.state.isLoading.set(false);
        }
    }

    private finalizeInstallation(appId: string, version: string) {
        const app = this.state.availableApps().find(a => a.id === appId);
        if (app) {
            this.state.availableApps.update(apps => apps.filter(a => a.id !== appId));
            this.state.installedApps.update(apps => [...apps, { ...app, status: 'installed' }]);
            
            this.state.downloadHistory.update(history => [
                { id: appId, name: app.name, version: version, date: new Date().toISOString(), status: 'completed' },
                ...history
            ]);
        }
        this.state.downloadingAppId.set(null);
        this.state.installProgress.set(0);
    }

    async checkHubUpdate(hubAppId: string) {
        try {
            const { data, error } = await this.supabase.client
                .from('app_releases')
                .select('version, checksum')
                .eq('app_id', hubAppId)
                .order('released_at', { ascending: false })
                .limit(1)
                .single();

            if (!error && data?.version && data.version !== this.state.currentHubVersion()) {
                this.state.latestHubVersion.set(data.version);
            }
        } catch (e) { console.error('Hub update check failed', e); }
    }

    async triggerHubUpdate() {
        if (this.state.isUpdatingHub()) return;
        // NOTE: In production this ID would be in env
        const hubAppId = '00000000-0000-0000-0000-000000000000'; 

        try {
            this.state.isUpdatingHub.set(true);
            const { data: release } = await this.supabase.client
                .from('app_releases')
                .select('download_url, checksum')
                .eq('app_id', hubAppId)
                .eq('platform', this.getOsKeyword())
                .order('released_at', { ascending: false })
                .limit(1)
                .single();

            if (!release) throw new Error("Update not found");

            await invoke('update_hub', { url: release.download_url, checksum: release.checksum });
            this.toast.success("Mise à jour téléchargée !");
        } catch (e) {
            this.toast.error(`Échec MAJ : ${e}`);
        } finally {
            this.state.isUpdatingHub.set(false);
        }
    }

    async pauseDownload(appId: string) {
        try {
            await invoke('pause_download', { appId });
            this.toast.info("Téléchargement mis en pause.");
        } catch (e) { this.toast.error("Erreur pause."); }
    }

    async resumeDownload(appId: string) {
        try {
            this.toast.info("Reprise...");
            await invoke('resume_download', { appId });
        } catch (e) { this.toast.error("Erreur reprise."); }
    }

    async cancelDownload(appId: string) {
        try {
            await invoke('cancel_download', { appId });
            this.state.downloadingAppId.set(null);
            this.state.installProgress.set(0);
            this.toast.info("Annulé.");
        } catch (e) { this.toast.error("Erreur annulation."); }
    }
}
