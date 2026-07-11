import { Injectable, inject } from '@angular/core';
import { HubStateService } from './hub-state.service';
import { HubDataService } from './hub-data.service';
import { SupabaseService } from '../supabase.service';
import { ToastService } from '../toast.service';
import { SyncLoggerService } from './sync-logger.service';

@Injectable({
    providedIn: 'root'
})
export class HubSyncService {
    private state = inject(HubStateService);
    private data = inject(HubDataService);
    private supabase = inject(SupabaseService);
    private toast = inject(ToastService);
    private logger = inject(SyncLoggerService);

    async executeDeepSync(appId?: string) {
        const id = appId || this.state.selectedApp()?.id;
        if (!id) return;
        this.toast.info("Début de la synchronisation profonde...");
        this.logger.logInfo("Démarrage de la synchronisation complète", id);
        try {
            const pushSuccess = await this.pushSync(id);
            if (pushSuccess) {
                await this.pullSync(id);
            } else {
                throw new Error("Le push des modifications locales a échoué.");
            }
            this.toast.success("Synchronisation complète terminée !");
            this.logger.logSuccess("Synchronisation profonde terminée avec succès", id);
        } catch (e) {
            this.toast.error("Échec de la synchronisation profonde.");
            this.logger.logError(`Échec de la synchronisation profonde: ${e}`, id);
        }
    }

    async pullSync(appId?: string) {
        if (this.state.deploymentMode() === 'structure' && this.state.deploymentRole() === 'client') {
            this.logger.logInfo("Pull ignoré : noeud client", appId);
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
            if (!cloudResponse.ok) throw new Error(`Erreur Cloud HTTP ${cloudResponse.status}`);
            const deepData = await cloudResponse.json();
            
            this.logger.logPull("Données reçues du Cloud", deepData, id);

            // 2. Push to LOCAL (avec retry car Django peut mettre du temps à bind le port)
            this.toast.info(`Injection dans l'application locale (127.0.0.1:${port})...`);
            this.logger.logInfo(`Tentative d'injection locale sur le port ${port}`, id);
            
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
                    this.logger.logInfo(`Port local ${port} non prêt, nouvel essai dans 1.5s... (Tentative ${attempts}/${maxAttempts})`, id);
                    await new Promise(r => setTimeout(r, 1500)); // Attente progressive
                }
            }

            if (!localResponse || !localResponse.ok) throw new Error("Erreur locale après plusieurs tentatives.");

            this.toast.success("Données locales mises à jour (Pull).");
            this.logger.logSuccess("Injection locale réussie (Pull terminé)", id);
            
            const tenantId = this.state.tenantId();
            if (tenantId) {
                await this.data.loadHomeSections(tenantId);
            } else {
                await this.data.loadHomeSections(hubId);
            }
        } catch (e) {
            this.toast.error(`Échec du Pull : ${e}`);
            this.logger.logError(`Échec du Pull : ${e}`, id);
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
            if (!deltaResponse.ok) throw new Error("Erreur lecture deltas depuis l'app locale.");
            const deltas = await deltaResponse.json();

            if (!deltas || deltas.length === 0) {
                this.logger.logInfo("Aucun delta local à pousser.", id);
                return true;
            }

            const pushLogId = this.logger.logPush(`Deltas locaux extraits (${deltas.length} éléments)`, deltas, id);

            // 2. Send to CLOUD
            const cloudPushResponse = await fetch(`${cloudApiUrl}/api/external/push-delta/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Hub-Api-Key': apiKey },
                body: JSON.stringify({ deltas })
            });
            const cloudPushResult = await cloudPushResponse.json().catch(() => null);
            
            if (cloudPushResult) {
                this.logger.updateLogAcknowledgement(pushLogId, cloudPushResult);
            }

            if (!cloudPushResponse.ok) {
                throw new Error(`Cloud a refusé les deltas (${cloudPushResponse.status}) ${cloudPushResult?.error || ''}`);
            }

            // 3. Mark as Synced LOCALLY
            await fetch(`http://127.0.0.1:${port}/api/external/sync-delta/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Hub-Api-Key': apiKey },
                body: JSON.stringify({ ids: deltas.map((d: any) => d.id) })
            });

            this.toast.success(`Push réussi (${deltas.length} modifs).`);
            this.logger.logSuccess(`Push réussi vers le Cloud (${deltas.length} éléments).`, cloudPushResult, id);
            return true;
        } catch (e) {
            this.toast.error(`Échec du Push : ${e}`);
            this.logger.logError(`Échec du Push : ${e}`, id);
            return false;
        } finally {
            this.state.isSyncing.set(false);
        }
    }
}
