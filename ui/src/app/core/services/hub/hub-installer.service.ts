import { Injectable, inject } from '@angular/core';
import { HubStateService } from './hub-state.service';
import { HubDataService } from './hub-data.service';
import { HubNavigationService } from './hub-navigation.service';
import { SupabaseService } from '../supabase.service';
import { ToastService } from '../toast.service';
import { invoke } from '@tauri-apps/api/core';

@Injectable({
    providedIn: 'root'
})
export class HubInstallerService {
    private state = inject(HubStateService);
    private data = inject(HubDataService);
    private navigation = inject(HubNavigationService);
    private supabase = inject(SupabaseService);
    private toast = inject(ToastService);

    async installApp(appId: string) {
        if (this.state.downloadingAppId()) return;

        try {
            this.state.downloadingAppId.set(appId);
            this.state.installProgress.set(0);

            const platform = navigator.userAgent.toLowerCase().includes('win') ? 'windows-latest' : 'ubuntu-latest';
            const { data: release, error } = await this.supabase.client
                .from('app_releases')
                .select('version, download_url, checksum')
                .eq('app_id', appId)
                .eq('platform', platform)
                .order('released_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !release) {
                this.toast.error("Version introuvable pour cette plateforme.");
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

    private finalizeInstallation(appId: string, version: string) {
        const app = this.state.availableApps().find(a => a.id === appId);
        if (app) {
            this.state.availableApps.update(apps => apps.filter(a => a.id !== appId));
            this.state.installedApps.update(apps => [...apps, { ...app, status: 'installed' }]);
            this.state.downloadHistory.update(h => [{ id: appId, name: app.name, version, date: new Date().toISOString(), status: 'completed' }, ...h]);
        }
        this.state.downloadingAppId.set(null);
        this.state.installProgress.set(0);
    }

    async uninstallApp(appId: string) {
        const app = [...this.state.installedApps(), ...this.state.availableApps()].find(a => a.id === appId);
        if (!app) return;

        try {
            this.state.isLoading.set(true);
            
            // Point Industrial v20.1: Fermeture forcée de l'app et du terminal avant désinstallation
            this.toast.info(`Arrêt de ${app.name} avant désinstallation...`);
            await this.navigation.closeTab(appId); 
            
            this.toast.info(`Désinstallation de ${app.name}...`);
            const config = this.state.dbConfig() || { host:'', port:0, user:'', pass:'' };
            await invoke('uninstall_app', { config, appId });

            if (this.state.hubId()) {
                await this.data.loadHomeSections(this.state.hubId()!);
            }
            this.toast.success(`${app.name} a été supprimée.`);
        } catch (e) {
            this.toast.error(`Erreur de désinstallation : ${e}`);
        } finally {
            this.state.isLoading.set(false);
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
