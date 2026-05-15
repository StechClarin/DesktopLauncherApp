import { Injectable, inject } from '@angular/core';
import { HubStateService } from './hub-state.service';
import { HubDataService } from './hub-data.service';
import { SupabaseService } from '../supabase.service';
import { ToastService } from '../toast.service';

@Injectable({
    providedIn: 'root'
})
export class HubSyncService {
    private state = inject(HubStateService);
    private data = inject(HubDataService);
    private supabase = inject(SupabaseService);
    private toast = inject(ToastService);

    async executeDeepSync(appId?: string) {
        const id = appId || this.state.selectedApp()?.id;
        if (!id) return;
        this.toast.info("Début de la synchronisation profonde...");
        try {
            await this.pullSync(id);
            await this.pushSync(id);
            this.toast.success("Synchronisation complète terminée !");
        } catch (e) {
            this.toast.error("Échec de la synchronisation profonde.");
        }
    }

    async pullSync(appId?: string) {
        if (this.state.deploymentMode() === 'structure' && this.state.deploymentRole() === 'client') {
            console.warn("[SYNC] Pull skipped: client machines don't sync with cloud.");
            return;
        }
        const id = appId || this.state.selectedApp()?.id;
        if (!id) return;
        const port = this.state.appPorts()[id] || 8000;
        this.state.isSyncing.set(true);
        try {
            const hubId = this.state.hubId();
            if (!hubId) throw new Error("Hub ID manquant.");

            const app = [...this.state.installedApps(), ...this.state.availableApps()].find(a => a.id === id);
            const cloudApiUrl = (app?.cloud_api_url || this.state.cloudApiUrl()).replace(/\/+$/, '').replace(/\/api$/, '');
            const apiKey = this.state.hubApiKey();

            // 1. Fetch from CLOUD
            const cloudResponse = await fetch(`${cloudApiUrl}/api/external/sync-tenant/?tenant_id=${hubId}`, {
                headers: { 'X-Hub-Api-Key': apiKey }
            });
            if (!cloudResponse.ok) throw new Error("Erreur Cloud.");
            const deepData = await cloudResponse.json();

            // 2. Push to LOCAL (avec retry car Django peut mettre du temps à bind le port)
            this.toast.info(`Injection dans l'application locale (127.0.0.1:${port})...`);
            
            let localResponse: Response | null = null;
            let attempts = 0;
            const maxAttempts = 5;

            while (attempts < maxAttempts) {
                try {
                    localResponse = await fetch(`http://127.0.0.1:${port}/api/external/sync-in/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Hub-Api-Key': apiKey },
                        body: JSON.stringify(deepData)
                    });
                    if (localResponse.ok) break;
                } catch (e) {
                    attempts++;
                    if (attempts >= maxAttempts) throw e;
                    console.log(`[SYNC] Local port ${port} not ready yet, retrying in 1s... (Attempt ${attempts}/${maxAttempts})`);
                    await new Promise(r => setTimeout(r, 1500)); // Attente progressive
                }
            }

            if (!localResponse || !localResponse.ok) throw new Error("Erreur locale après plusieurs tentatives.");

            this.toast.success("Données locales mises à jour (Pull).");
            await this.data.loadHomeSections(hubId);
        } catch (e) {
            this.toast.error(`Échec du Pull : ${e}`);
            throw e;
        } finally {
            this.state.isSyncing.set(false);
        }
    }

    async pushSync(appId?: string): Promise<boolean> {
        if (this.state.deploymentMode() === 'structure' && this.state.deploymentRole() === 'client') {
            return true; 
        }
        const id = appId || this.state.selectedApp()?.id;
        if (!id) return true;
        const port = this.state.appPorts()[id] || 8000;
        this.state.isSyncing.set(true);
        try {
            const app = [...this.state.installedApps(), ...this.state.availableApps()].find(a => a.id === id);
            const cloudApiUrl = (app?.cloud_api_url || this.state.cloudApiUrl()).replace(/\/+$/, '').replace(/\/api$/, '');
            const apiKey = this.state.hubApiKey();

            // 1. Fetch Deltas from LOCAL
            const deltaResponse = await fetch(`http://127.0.0.1:${port}/api/external/sync-delta/`, {
                headers: { 'X-Hub-Api-Key': apiKey }
            });
            if (!deltaResponse.ok) throw new Error("Erreur lecture deltas.");
            const deltas = await deltaResponse.json();

            if (!deltas || deltas.length === 0) return true;

            // 2. Send to CLOUD
            const cloudPushResponse = await fetch(`${cloudApiUrl}/api/external/push-delta/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Hub-Api-Key': apiKey },
                body: JSON.stringify({ deltas })
            });
            if (!cloudPushResponse.ok) throw new Error("Cloud a refusé les deltas.");

            // 3. Mark as Synced LOCALLY
            await fetch(`http://127.0.0.1:${port}/api/external/sync-delta/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Hub-Api-Key': apiKey },
                body: JSON.stringify({ ids: deltas.map((d: any) => d.id) })
            });

            this.toast.success(`Push réussi (${deltas.length} modifs).`);
            return true;
        } catch (e) {
            this.toast.error(`Échec du Push : ${e}`);
            return false;
        } finally {
            this.state.isSyncing.set(false);
        }
    }
}
