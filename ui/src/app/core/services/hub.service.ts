import { Injectable, inject } from '@angular/core';
import { listen } from '@tauri-apps/api/event';
import { HubStateService } from './hub/hub-state.service';
import { HubDataService } from './hub/hub-data.service';
import { HubInstallerService } from './hub/hub-installer.service';
import { HubNavigationService } from './hub/hub-navigation.service';
import { HubSyncService } from './hub/hub-sync.service';
import { HubConfigService } from './hub/hub-config.service';
import { DbConfig } from '../models/hub.models';

@Injectable({
    providedIn: 'root'
})
export class HubService {
    // Inject Sub-Services
    private state = inject(HubStateService);
    private data = inject(HubDataService);
    private installer = inject(HubInstallerService);
    private navigation = inject(HubNavigationService);
    private sync = inject(HubSyncService);
    private config = inject(HubConfigService);

    // Expose Signals (Facade Pattern)
    hubId = this.state.hubId;
    tenantName = this.state.tenantName;
    installedApps = this.state.installedApps;
    availableApps = this.state.availableApps;
    isLoading = this.state.isLoading;
    activeTab = this.state.activeTab;
    selectedApp = this.state.selectedApp;
    activeTabs = this.state.activeTabs;
    installProgress = this.state.installProgress;
    downloadingAppId = this.state.downloadingAppId;
    isSyncing = this.state.isSyncing;
    runningAppIds = this.state.runningAppIds;
    isHubActive = this.state.isHubActive;
    dbConfig = this.state.dbConfig;
    isOffline = this.state.isOffline;
    hasUpdate = this.state.hasUpdate;
    currentHubVersion = this.state.currentHubVersion;
    latestHubVersion = this.state.latestHubVersion;
    unlockedModuleIds = this.state.unlockedModuleIds;
    downloadHistory = this.state.downloadHistory;
    downloadTasks = this.state.downloadTasks;
    isUpdatingHub = this.state.isUpdatingHub;
    isLaunchingApp = this.state.isLaunchingApp;
    launchStep = this.state.launchStep;
    
    // Missing Signals
    installingApps = this.state.installingApps;
    featuredApp = this.state.featuredApp;
    recentApps = this.state.recentApps;
    featuredModules = this.state.featuredModules;
    storeNewReleases = this.state.storeNewReleases;
    mostUsedApp = this.state.mostUsedApp;
    libraryModules = this.state.libraryModules;
    hubUpdateProgress = this.state.hubUpdateProgress;
    storeDeals = this.state.storeDeals;
    storeModules = this.state.storeModules;
    refreshTabRequested$ = this.state.refreshTabRequested$;
    
    // Expose Computed (Facade Pattern)
    enrichedApps = this.state.enrichedApps;
    allApps = this.state.allApps;
    libraryCarousel = this.state.libraryCarousel;
    libraryStats = this.state.libraryStats;
    storeFeatured = this.state.storeFeatured;

    constructor() {
        this.init();
    }

    private async init() {
        // 1. Listeners (Orchestration)
        await listen('download-progress', (event: any) => {
            const { app_id, progress } = event.payload;
            if (this.state.downloadingAppId() === app_id) {
                this.state.installProgress.set(progress);
            }
        });

        await listen('download-status-changed', async () => {
            await this.syncDownloadTasks();
        });

        await listen('hub-app-status-changed', async (event: any) => {
            const { app_id, status } = event.payload;
            if (status === 'installed' || status === 'uninstalled') {
                if (this.state.hubId()) await this.data.loadHomeSections(this.state.hubId()!);
            }
        });

        // 2. Initialize Data
        await this.config.loadDbConfig();
        await this.data.init();
    }

    // --- DELEGATION METHODS ---
    
    // Data & Auth
    loadHomeSections(tenantId: string) { return this.data.loadHomeSections(tenantId); }
    isAppLicensed(app: any) { return this.data.isAppLicensed(app); }
    isAppOnDisk(appId: string) { return this.state.installedApps().some(a => a.id === appId && a.status === 'installed'); }
    isAppOwned(appId: string) { return this.state.installedApps().some(a => a.id === appId && a.status === 'owned'); }

    // Installer
    installApp(appId: string) { return this.installer.installApp(appId); }
    uninstallApp(appId: string) { return this.installer.uninstallApp(appId); }
    pauseDownload(appId: string) { return this.installer.pauseDownload(appId); }
    resumeDownload(appId: string) { return this.installer.resumeDownload(appId); }
    cancelDownload(appId: string) { return this.installer.cancelDownload(appId); }

    // Navigation
    launchApp(app: any) { return this.navigation.launchApp(app); }
    setActiveTab(tab: any) { return this.navigation.setActiveTab(tab); }
    openTab(id: string, name: string, url: string, logo?: string) { return this.navigation.openTab(id, name, url, logo); }
    closeTab(id: string) { return this.navigation.closeTab(id); }
    selectTab(id: string) { return this.navigation.selectTab(id); }
    openStoreItem(id: string) { return this.navigation.openStoreItem(id); }
    refreshTab(appId: string) { return this.state.refreshTabRequestedSource.next(appId); }
    navigateToModuleApp(module: any) { 
        const app = this.state.allApps().find(a => a.name === module.appName || a.name === module.parentAppName);
        if (app) this.navigation.openStoreItem(app.id);
    }

    // Sync
    pullSync(appId?: string) { 
        const id = appId || this.state.selectedApp()?.id;
        if (id) return this.sync.pullSync(id); 
        return Promise.reject("No app selected for sync");
    }
    pushSync(appId: string) { return this.sync.pushSync(appId); }
    executeDeepSync(appId?: string) { return this.sync.executeDeepSync(appId); }

    // Config & History
    saveDbConfig(config: any) { return this.config.saveDbConfig(config); }
    testDbConnection(config: any) { return this.config.testDbConnection(config); }
    toggleOfflineMode() { return this.config.toggleOfflineMode(); }
    clearHistoryItem(id: string) {
        this.state.downloadHistory.update(h => h.filter(item => item.id !== id));
    }
    
    // Updates
    checkHubUpdate() { 
        // This would normally call a logic in HubDataService
        console.log("Checking for Hub updates...");
    }
    triggerHubUpdate() {
        console.log("Triggering Hub update...");
    }
    
    // Utils
    async syncDownloadTasks() {
        const { invoke } = await import('@tauri-apps/api/core');
        const tasks = await invoke<any[]>('get_download_tasks');
        this.state.downloadTasks.set(tasks || []);
    }

    isDownloadPaused(appId: string): boolean {
        const task = this.state.downloadTasks().find(t => t.app_id === appId);
        return task?.status === 'Paused';
    }
}
