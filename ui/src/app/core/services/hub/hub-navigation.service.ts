import { inject, Injectable } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { invoke } from '@tauri-apps/api/core';
import { TerminalService } from '../terminal.service';
import { ToastService } from '../toast.service';
import { HubStateService } from './hub-state.service';
import { HubSyncService } from './hub-sync.service';
import { HubConfigService } from './hub-config.service';
import { SupabaseService } from '../supabase.service';

@Injectable({
    providedIn: 'root'
})
export class HubNavigationService {
    private state = inject(HubStateService);
    private sync = inject(HubSyncService);
    private supabase = inject(SupabaseService);
    private toast = inject(ToastService);
    private terminal = inject(TerminalService);
    private sanitizer = inject(DomSanitizer);
    private configService = inject(HubConfigService);

    constructor() {
        this.syncActiveApps();
    }

    async syncActiveApps() {
        if (!(window as any).__TAURI_INTERNALS__) return;
        try {
            const apps: any[] = await invoke('get_active_apps');
            this.state.activeTabs.update(tabs => {
                // Create a new array to avoid unnecessary re-renders
                let newTabs = [...tabs];
                
                // Remove tabs that are no longer running, but keep active tabs to prevent flashing
                const runningIds = new Set(apps.map(a => a.id));
                newTabs = newTabs.filter(t => runningIds.has(t.id) || t.isActive);
                
                // Update existing tabs with new port info without changing URL unnecessarily
                apps.forEach(app => {
                    const existing = newTabs.find(t => t.id === app.id);
                    if (existing) {
                        // Only update port cache, don't change URL if it's already set
                        this.state.appPorts.update(p => ({ ...p, [app.id]: app.port }));
                        // Don't update existing.url to prevent iframe reload
                    } else {
                        // Add new tab
                        const tabUrl = `http://127.0.0.1:${app.port}`;
                        newTabs.push({ 
                            id: app.id, 
                            name: app.name, 
                            url: tabUrl, 
                            safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(tabUrl),
                            logo: app.icon,
                            isActive: false 
                        });
                        // Update port cache
                        this.state.appPorts.update(p => ({ ...p, [app.id]: app.port }));
                    }
                });

                // Ensure active tab is still valid - only activate last tab if no active tab exists
                const hasActiveTab = newTabs.some(t => t.isActive);
                if (!hasActiveTab && newTabs.length > 0) {
                    // Find the most recently opened tab or the last one
                    const lastTab = newTabs[newTabs.length - 1];
                    if (lastTab) {
                        lastTab.isActive = true;
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
        console.log(`[OPEN_TAB] appId=${appId}, name=${name}, url=${url}, logo=${logo}`);
        this.state.activeTabs.update(tabs => {
            const newTabs = tabs.map(t => ({ ...t, isActive: false }));
            const existing = newTabs.find(t => t.id === appId);
            if (existing) {
                if (url && existing.url !== url) {
                    existing.url = url;
                    existing.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
                }
                if (logo) existing.logo = logo;
                existing.isActive = true;
                console.log(`[OPEN_TAB] Updated existing tab, new URL: ${existing.url}`);
                return newTabs;
            }
            if (!url) {
                const port = this.state.appPorts()[appId];
                if (port) url = `http://127.0.0.1:${port}`;
                console.log(`[OPEN_TAB] No URL provided, constructed from port ${port}: ${url}`);
            }
            const newTab = { 
                id: appId, 
                name, 
                url, 
                safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url),
                logo, 
                isActive: true 
            };
            console.log(`[OPEN_TAB] Created new tab:`, newTab);
            return [...newTabs, newTab];
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
            
            // If we removed the active tab, activate the last remaining tab or switch to hub
            if (closingTab?.isActive) {
                if (newTabs.length > 0) {
                    newTabs[newTabs.length - 1].isActive = true;
                } else {
                    // No more tabs, switch to hub
                    this.setActiveTab('home');
                }
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
        
        // Ouvre le terminal de debug pour suivre l'initialisation
        this.terminal.setActiveApp(app.id);
        this.terminal.clear(app.id);
        this.terminal.resetReady();
        this.terminal.open(); // ✅ Ouvre le terminal pour les logs Django/Rust
        
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

            this.state.launchStep.set('Vérification de la configuration...');
            let config = await this.configService.loadDbConfig(app.id);
            if (!config) {
                config = {
                    host: '127.0.0.1',
                    port: 5432,
                    user: 'postgres',
                    pass: '',
                    db_name: '',
                    mode: 'solo',
                    role: 'server'
                };
            }
            // On s'assure que le fichier db.json existe avant le lancement
            await invoke('initialize_database', { config, appId: app.id });

            this.state.launchStep.set('Démarrage du moteur local...');
            const actualPort = await invoke<number>('execute_app', {
                appId: app.id,
                tenantId: hubId,
                cloudApiUrl: app.cloud_api_url || null
            });

            console.log(`[LAUNCH DEBUG] App ${app.id} (${app.name}) returned port: ${actualPort} (type: ${typeof actualPort})`);
            this.state.appPorts.update(p => ({ ...p, [app.id]: actualPort }));
            
            // Log dans le terminal
            console.log(`\n=== 🚀 LANCEMENT DE L'APP ${app.name.toUpperCase()} ===`);
            console.log(`Port dynamique: ${actualPort}`);
            console.log(`URL d'accès: http://127.0.0.1:${actualPort}`);
            console.log(`En attente du signal READY...`);
            
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
                const tabUrl = `http://127.0.0.1:${actualPort}`;
                console.log(`[LAUNCH DEBUG] Opening tab for ${app.id} with URL: ${tabUrl}`);
                console.log(`[LAUNCH DEBUG] Final port value: ${actualPort}, type: ${typeof actualPort}`);
                console.log(`=== ✅ APPLICATION PRÊTE ===\nURL: ${tabUrl}\n`);
                
                this.openTab(app.id, app.name, tabUrl, app.icon_svg || app.icon);
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
