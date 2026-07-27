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
            const cloudUrl = `${cloudApiUrl}/api/external/sync-tenant/?tenant_id=${hubId}`;
            this.logger.logInfo(`Récupération des données depuis le cloud (${cloudUrl})...`, id);
            const cloudResponse = await fetch(cloudUrl, {
                headers: { 'X-Hub-Api-Key': apiKey }
            });
            if (!cloudResponse.ok) throw new Error(`Erreur Cloud HTTP ${cloudResponse.status}`);
            const deepData = await cloudResponse.json();
            
            this.logger.logPull("Données reçues du Cloud", deepData, id);

            // 2. Push to LOCAL (avec retry car Django peut mettre du temps à bind le port)
            const localUrl = `http://127.0.0.1:${port}/api/external/sync-in/`;
            this.toast.info(`Injection dans l'application locale (127.0.0.1:${port})...`);
            this.logger.logInfo(`Tentative d'injection locale sur ${localUrl}...`, id);
            
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
                    if (localResponse.ok) {
                        break;
                    }
                    
                    let errMsg = `Code HTTP ${localResponse.status}`;
                    try {
                        const errJson = await localResponse.json();
                        if (errJson && errJson.error) {
                            errMsg = errJson.error;
                        }
                    } catch (e) {}
                    
                    throw new Error(errMsg);
                } catch (e: any) {
                    attempts++;
                    if (attempts >= maxAttempts) throw e;
                    this.logger.logInfo(`Port local ${port} non prêt ou en erreur (${e.message || e}), nouvel essai dans 1.5s... (Tentative ${attempts}/${maxAttempts})`, id);
                    await new Promise(r => setTimeout(r, 1500)); // Attente progressive
                }
            }

            if (!localResponse || !localResponse.ok) throw new Error("Erreur locale après plusieurs tentatives.");

            this.toast.success("Données locales mises à jour (Pull).");
            this.logger.logSuccess("Injection locale réussie (Pull terminé)", id);
            
            // Lancement de la synchronisation des fichiers
            await this.syncAssets(id, 'pull');
            
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
            const localUrl = `http://127.0.0.1:${port}/api/external/sync-delta/`;
            this.logger.logInfo(`Lecture des deltas locaux depuis ${localUrl}...`, id);
            const deltaResponse = await fetch(localUrl, {
                headers: { 'X-Hub-Api-Key': apiKey }
            });
            if (!deltaResponse.ok) throw new Error(`Erreur lecture deltas depuis ${localUrl}. Status: ${deltaResponse.status}`);
            const deltas = await deltaResponse.json();

            if (!deltas || deltas.length === 0) {
                this.logger.logInfo("Aucun delta local à pousser.", id);
                return true;
            }

            const pushLogId = this.logger.logPush(`Deltas locaux extraits (${deltas.length} éléments)`, deltas, id);

            // 2. Send to CLOUD
            const cloudUrl = `${cloudApiUrl}/api/external/push-delta/`;
            this.logger.logInfo(`Envoi des deltas vers le cloud (${cloudUrl})...`, id);
            const cloudPushResponse = await fetch(cloudUrl, {
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
            this.logger.logSuccess(`Push réussi vers le Cloud (${deltas.length} éléments).`, id, cloudPushResult);
            
            // Lancement de la synchronisation des fichiers
            await this.syncAssets(id, 'push');
            
            return true;
        } catch (e) {
            this.toast.error(`Échec du Push : ${e}`);
            this.logger.logError(`Échec du Push : ${e}`, id);
            return false;
        } finally {
            this.state.isSyncing.set(false);
        }
    }

    async syncAssets(appId: string | undefined, type: 'pull' | 'push') {
        const id = appId || this.state.selectedApp()?.id;
        if (!id) return;
        
        const port = this.state.appPorts()[id] || 8000;
        const hubId = this.state.hubId();
        const apiKey = this.state.hubApiKey();
        
        if (!hubId) return;

        const app = [...this.state.installedApps(), ...this.state.availableApps()].find(a => a.id === id);
        const cloudApiUrl = (app?.cloud_api_url || this.state.cloudApiUrl()).replace(/\/+$/, '').replace(/\/api$/, '');

        const localUrl = `http://127.0.0.1:${port}`;
        
        try {
            // 1. Fetch manifests
            this.logger.logInfo(`Récupération des manifestes de fichiers pour le ${type}...`, id);
            
            const [cloudRes, localRes] = await Promise.all([
                fetch(`${cloudApiUrl}/api/external/sync-assets/manifest/?tenant_id=${hubId}`, { headers: { 'X-Hub-Api-Key': apiKey } }),
                fetch(`${localUrl}/api/external/sync-assets/manifest/?tenant_id=${hubId}`, { headers: { 'X-Hub-Api-Key': apiKey } })
            ]);

            if (!cloudRes.ok) {
                let msg = `Erreur Cloud (HTTP ${cloudRes.status})`;
                try {
                    const err = await cloudRes.json();
                    if (err && err.error) msg += `: ${err.error}`;
                } catch(e) {}
                throw new Error(msg);
            }

            if (!localRes.ok) {
                let msg = `Erreur Local (HTTP ${localRes.status})`;
                try {
                    const err = await localRes.json();
                    if (err && err.error) msg += `: ${err.error}`;
                } catch(e) {}
                throw new Error(msg);
            }

            const cloudData = await cloudRes.json();
            const localData = await localRes.json();
            
            const cloudManifest: any[] = cloudData.manifest || [];
            const localManifest: any[] = localData.manifest || [];
            
            const cloudMap = new Map(cloudManifest.map(m => [m.path, m.hash]));
            const localMap = new Map(localManifest.map(m => [m.path, m.hash]));

            if (type === 'pull') {
                // Find files in cloud missing or different locally
                const toDownload = cloudManifest.filter(m => !localMap.has(m.path) || localMap.get(m.path) !== m.hash);
                if (toDownload.length === 0) {
                    this.logger.logInfo("Aucun fichier à télécharger.", id);
                    return;
                }
                this.toast.info(`Téléchargement de ${toDownload.length} fichier(s)...`);
                this.logger.logInfo(`Téléchargement de ${toDownload.length} fichier(s) depuis le Cloud...`, id);
                
                for (const file of toDownload) {
                    try {
                        // Download from cloud
                        const downloadRes = await fetch(`${cloudApiUrl}/api/external/sync-assets/transfer/?path=${encodeURIComponent(file.path)}`, {
                            headers: { 'X-Hub-Api-Key': apiKey }
                        });
                        if (!downloadRes.ok) throw new Error(`Download HTTP ${downloadRes.status}`);
                        const blob = await downloadRes.blob();
                        
                        // Upload to local
                        const formData = new FormData();
                        formData.append('file', blob, file.path.split('/').pop() || 'file');
                        formData.append('path', file.path);
                        
                        const uploadRes = await fetch(`${localUrl}/api/external/sync-assets/transfer/`, {
                            method: 'POST',
                            headers: { 'X-Hub-Api-Key': apiKey },
                            body: formData
                        });
                        if (!uploadRes.ok) throw new Error(`Upload HTTP ${uploadRes.status}`);
                    } catch (err) {
                        this.logger.logError(`Erreur transfert fichier ${file.path}: ${err}`, id);
                    }
                }
                this.toast.success(`${toDownload.length} fichier(s) synchronisé(s) en local.`);
                this.logger.logSuccess(`Pull Assets terminé : ${toDownload.length} fichiers transférés.`, id);
            } else if (type === 'push') {
                // Find files locally missing or different in cloud
                const toUpload = localManifest.filter(m => !cloudMap.has(m.path) || cloudMap.get(m.path) !== m.hash);
                if (toUpload.length === 0) {
                    this.logger.logInfo("Aucun fichier à pousser.", id);
                    return;
                }
                this.toast.info(`Envoi de ${toUpload.length} fichier(s) au Cloud...`);
                this.logger.logInfo(`Envoi de ${toUpload.length} fichier(s) vers le Cloud...`, id);
                
                for (const file of toUpload) {
                    try {
                        // Download from local
                        const downloadRes = await fetch(`${localUrl}/api/external/sync-assets/transfer/?path=${encodeURIComponent(file.path)}`, {
                            headers: { 'X-Hub-Api-Key': apiKey }
                        });
                        if (!downloadRes.ok) throw new Error(`Download HTTP ${downloadRes.status}`);
                        const blob = await downloadRes.blob();
                        
                        // Upload to cloud
                        const formData = new FormData();
                        formData.append('file', blob, file.path.split('/').pop() || 'file');
                        formData.append('path', file.path);
                        
                        const uploadRes = await fetch(`${cloudApiUrl}/api/external/sync-assets/transfer/`, {
                            method: 'POST',
                            headers: { 'X-Hub-Api-Key': apiKey },
                            body: formData
                        });
                        if (!uploadRes.ok) throw new Error(`Upload HTTP ${uploadRes.status}`);
                    } catch (err) {
                        this.logger.logError(`Erreur transfert fichier ${file.path}: ${err}`, id);
                    }
                }
                this.toast.success(`${toUpload.length} fichier(s) envoyés au Cloud.`);
                this.logger.logSuccess(`Push Assets terminé : ${toUpload.length} fichiers transférés.`, id);
            }
        } catch (e) {
            this.toast.error(`Échec synchro fichiers : ${e}`);
            this.logger.logError(`Erreur critique synchro fichiers : ${e}`, id);
        }
    }
}
