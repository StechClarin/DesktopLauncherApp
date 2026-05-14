import { Injectable, inject } from '@angular/core';
import { HubStateService } from './hub-state.service';
import { HubSyncService } from './hub-sync.service';
import { SupabaseService } from '../supabase.service';
import { ToastService } from '../toast.service';
import { TerminalService } from '../terminal.service';
import { invoke } from '@tauri-apps/api/core';

@Injectable({
    providedIn: 'root'
})
export class HubNavigationService {
    private state = inject(HubStateService);
    private sync = inject(HubSyncService);
    private supabase = inject(SupabaseService);
    private toast = inject(ToastService);
    private terminal = inject(TerminalService);

    constructor() {
        this.syncActiveApps();
    }

    async syncActiveApps() {
        if (!(window as any).__TAURI_INTERNALS__) return;
        try {
            const apps: any[] = await invoke('get_active_apps');
            this.state.activeTabs.update(tabs => {
                // 1. On garde le Hub s'il était là (mais ici il n'est pas dans tabs, c'est l'onglet par défaut)
                let newTabs = [...tabs];
                
                // 2. Supprimer les onglets qui ne tournent plus
                const runningIds = new Set(apps.map(a => a.id));
                newTabs = newTabs.filter(t => runningIds.has(t.id));

                // 3. Ajouter les nouveaux venus
                apps.forEach(app => {
                    if (!newTabs.find(t => t.id === app.id)) {
                        newTabs.push({ 
                            id: app.id, 
                            name: app.name, 
                            url: `http://127.0.0.1:${app.port}`, 
                            isActive: false 
                        });
                        // Mettre à jour le cache des ports
                        this.state.appPorts.update(p => ({ ...p, [app.id]: app.port }));
                    }
                });

                // 4. Si l'onglet actif a disparu, on donne le focus au dernier ou au Hub
                if (tabs.length > 0 && !newTabs.some(t => t.isActive)) {
                    if (newTabs.length > 0) {
                        newTabs[newTabs.length - 1].isActive = true;
                    }
                }

                return newTabs;
            });
        } catch (e) {
            console.error('Failed to sync active apps', e);
        }
    }

    setActiveTab(tab: 'home' | 'library' | 'store' | 'downloads' | 'settings') {
        this.state.activeTab.set(tab);
        sessionStorage.setItem('hub-active-tab', tab);
        this.state.selectedApp.set(null); 
    }

    openTab(appId: string, name: string, url: string, logo?: string) {
        this.state.activeTabs.update(tabs => {
            const newTabs = tabs.map(t => ({ ...t, isActive: false }));
            const existing = newTabs.find(t => t.id === appId);
            if (existing) {
                if (url && existing.url !== url) existing.url = url;
                if (logo) existing.logo = logo;
                existing.isActive = true;
                return newTabs;
            }
            if (!url) {
                const port = this.state.appPorts()[appId];
                if (port) url = `http://127.0.0.1:${port}`;
            }
            return [...newTabs, { id: appId, name, url, logo, isActive: true }];
        });
    }

    async closeTab(appId: string) {
        try {
            this.toast.info(`Synchronisation finale pour ${appId}...`);
            // Point Industrial v19.0: On ajoute un timeout pour ne pas bloquer la fermeture
            const syncPromise = Promise.all([this.sync.pullSync(appId), this.sync.pushSync(appId)]);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 5000));
            
            await Promise.race([syncPromise, timeoutPromise]).catch(e => {
                console.warn(`[HUB] Sync skipped or timed out for ${appId}`);
            });
        } catch (e) {
            console.warn(`[HUB] Auto-Sync failed for ${appId}, proceeding with close.`, e);
        }

        try {
            if ((window as any).__TAURI_INTERNALS__) {
                await invoke('kill_app', { appId });
            }
            // Point Industrial v20.2: Fermeture du terminal associé
            this.terminal.close(); // Correction: Pas d'argument selon l'erreur TS
        } catch (e) { console.error('Failed to kill app', e); }

        this.state.activeTabs.update(tabs => {
            const closingTab = tabs.find(t => t.id === appId);
            const newTabs = tabs.filter(t => t.id !== appId);
            if (closingTab?.isActive && newTabs.length > 0) {
                newTabs[newTabs.length - 1].isActive = true;
            }
            return newTabs;
        });
    }

    selectTab(appId: string | 'hub') {
        this.state.activeTabs.update(tabs => tabs.map(t => ({
            ...t, isActive: appId !== 'hub' && t.id === appId
        })));
    }

    async launchApp(app: any) {
        if (!(window as any).__TAURI_INTERNALS__) {
            this.toast.show('info', 'Le lancement d\'applications n\'est possible que depuis l\'application de bureau.');
            return;
        }
        console.log(`Preparing launch for app: ${app.name}`);
        this.state.launchStep.set('Préparation de l\'environnement...');
        
        this.terminal.setActiveApp(app.id);
        this.terminal.clear(app.id);
        this.terminal.resetReady();
        // this.terminal.open(); // On ne l'ouvre plus forcément, l'overlay de chargement suffit
        
        try {
            const user = (await this.supabase.client.auth.getSession()).data.session?.user;
            const hubId = this.state.hubId();
            if (!user || !hubId) {
                this.toast.error("Session invalide.");
                this.state.isLaunchingApp.set(null);
                return;
            }

            if (this.state.runningAppIds().has(app.id)) {
                this.state.launchStep.set('Application déjà lancée, basculement...');
                const existingTab = this.state.activeTabs().find(t => t.id === app.id);
                const currentUrl = existingTab?.url || (this.state.appPorts()[app.id] ? `http://127.0.0.1:${this.state.appPorts()[app.id]}` : '');
                this.openTab(app.id, app.name, currentUrl);
                setTimeout(() => this.state.isLaunchingApp.set(null), 500);
                return;
            }

            this.state.launchStep.set('Démarrage du moteur local...');
            const actualPort = await invoke<number>('execute_app', {
                appId: app.id,
                tenantId: hubId,
                cloudApiUrl: app.cloud_api_url || null
            });

            this.state.appPorts.update(p => ({ ...p, [app.id]: actualPort }));
            this.state.launchStep.set('Initialisation du système (cela peut prendre du temps au premier lancement)...');
            
            // Wait for READY signal or monitor for errors
            const isReady = await new Promise<boolean>((resolve) => {
                let lastActivity = Date.now();
                const MAX_INACTIVITY = 30000; // 30s sans aucun log = blocage
                const TOTAL_TIMEOUT = 120000; // 2 minutes max pour le premier lancement
                
                const watchdog = setInterval(() => {
                    const inactiveTime = Date.now() - lastActivity;
                    if (inactiveTime > MAX_INACTIVITY) {
                        console.warn(`[LAUNCH] Inactivity detected for ${app.name}`);
                        clearInterval(watchdog);
                        subReady.unsubscribe();
                        subLogs.unsubscribe();
                        resolve(false); // Instable
                    }
                }, 5000);

                const timeout = setTimeout(() => {
                    clearInterval(watchdog);
                    subReady.unsubscribe();
                    subLogs.unsubscribe();
                    resolve(false);
                }, TOTAL_TIMEOUT);

                const subReady = this.terminal.ready$.subscribe(ready => {
                    if (ready && ready.appId === app.id) {
                        clearTimeout(timeout);
                        clearInterval(watchdog);
                        subReady.unsubscribe();
                        subLogs.unsubscribe();
                        resolve(true);
                    }
                });

                const subLogs = this.terminal.output$.subscribe(log => {
                    if (log && log.appId === app.id) {
                        lastActivity = Date.now(); // L'app donne des signes de vie
                        if (log.text.toLowerCase().includes('error') || log.text.toLowerCase().includes('exception') || log.text.toLowerCase().includes('failed')) {
                            this.state.launchStep.set('Détection d\'une instabilité...');
                        }
                    }
                });
            });
            
            if (isReady) {
                this.state.launchStep.set('Application prête !');
                this.openTab(app.id, app.name, `http://127.0.0.1:${actualPort}`, app.icon_svg || app.icon);
                this.state.isLaunchingApp.set(null); // On libère l'UI immédiatement
                
                // On lance la synchro sans bloquer l'UI
                this.sync.pullSync(app.id).catch(err => {
                    console.warn(`[HUB] Initial background sync failed for ${app.name}:`, err);
                });
            } else {
                this.toast.error(`Erreur : L'application ${app.name} semble instable ou trop longue à démarrer.`, 8000);
                this.state.isLaunchingApp.set(null);
            }
        } catch (error) {
            this.toast.error(`Erreur au lancement : ${error}`);
            this.state.isLaunchingApp.set(null);
        }
    }

    openStoreItem(appId: string) {
        const app = this.state.allApps().find(a => a.id === appId);
        if (app) {
            this.state.selectedApp.set(app);
            this.setActiveTab('store');
        }
    }

    navigateToModuleApp(module: any) {
        const app = this.state.allApps().find(a => a.id === module.app_id);
        if (app) {
            this.state.selectedApp.set(app);
        }
    }
}
