import { Injectable, inject } from '@angular/core';
import { HubStateService } from './hub/hub-state.service';
import { HubDataService } from './hub/hub-data.service';
import { HubInstallerService } from './hub/hub-installer.service';
import { HubNavigationService } from './hub/hub-navigation.service';
import { HubSyncService } from './hub/hub-sync.service';
import { HubConfigService } from './hub/hub-config.service';

@Injectable({
    providedIn: 'root'
})
export class HubService {
    // Services injectés (Architecture modulaire)
    public state = inject(HubStateService);
    public data = inject(HubDataService);
    public installer = inject(HubInstallerService);
    public navigation = inject(HubNavigationService);
    public sync = inject(HubSyncService);
    public config = inject(HubConfigService);

    constructor() {
        this.init();
    }

    private async init() {
        console.log("[HUB_FACADE] Initializing Hub Service...");
        try {
            await this.config.loadDbConfig();
            await this.data.init();
        } catch (e) {
            console.error("[HUB_FACADE] Init failed", e);
        }
    }

    // --- EXPOSITION DES SIGNAUX (Facade Pattern) ---
    
    // Identité et État Global
    hubId = this.state.hubId;
    tenantName = this.state.tenantName;
    isLoading = this.state.isLoading;
    isOffline = this.state.isOffline;
    isSyncing = this.state.isSyncing;
    deploymentMode = this.state.deploymentMode;
    deploymentRole = this.state.deploymentRole;
    
    // Applications et Modules
    installedApps = this.state.installedApps;
    availableApps = this.state.availableApps;
    allApps = this.state.allApps; 
    unlockedModuleIds = this.state.unlockedModuleIds;
    
    // Sélections et Navigation
    selectedApp = this.state.selectedApp;
    activeTab = this.state.activeTab;
    activeTabs = this.state.activeTabs;
    isHubActive = this.state.isHubActive; 
    runningAppIds = this.state.runningAppIds;
    
    // Installation et Mise à jour
    downloadingAppId = this.state.downloadingAppId;
    installingApps = this.state.installingApps; // Signal computed
    installProgress = this.state.installProgress;
    hubUpdateProgress = this.state.hubUpdateProgress;
    isUpdatingHub = this.state.isUpdatingHub;
    downloadTasks = this.state.downloadTasks;
    downloadHistory = this.state.downloadHistory;
    
    // Hub Update States
    currentHubVersion = this.state.currentHubVersion;
    latestHubVersion = this.state.latestHubVersion;
    hasUpdate = this.state.hasUpdate;

    // RxJS Stream
    refreshTabRequested$ = this.state.refreshTabRequested$;
    
    // --- COMPUTED SIGNALS POUR LES VUES ---
    recentApps = this.state.recentApps;
    popularApps = this.state.popularApps;
    featuredModules = this.state.featuredModules;
    featuredApp = this.state.featuredApp;
    recommendedApps = this.state.recommendedApps;
    mostUsedApp = this.state.mostUsedApp;
    appUpdates = this.state.appUpdates;
    libraryModules = this.state.libraryModules;
    
    // Store & Library 2.0
    libraryCarousel = this.state.libraryCarousel;
    libraryStats = this.state.libraryStats;
    moduleRecommendations = this.state.moduleRecommendations;
    storeFeatured = this.state.storeFeatured;
    storeDeals = this.state.storeDeals;
    storeNewReleases = this.state.storeNewReleases;
    storeTopDownloads = this.state.storeTopDownloads;
    storeCatalog = this.state.storeCatalog;
    storeModules = this.state.storeModules;

    // --- MÉTHODES (DÉLÉGATION) ---
    
    // Navigation
    setActiveTab(tab: any) { this.navigation.setActiveTab(tab); }
    openTab(id: string, name: string, url: string, logo?: string) { this.navigation.openTab(id, name, url, logo); }
    closeTab(id: string) { return this.navigation.closeTab(id); }
    selectTab(id: string) { this.navigation.selectTab(id); }
    openStoreItem(id: string) { this.navigation.openStoreItem(id); }
    navigateToModuleApp(mod: any) { this.navigation.navigateToModuleApp(mod); }

    // Installation
    installApp(id: string) { return this.installer.installApp(id); }
    uninstallApp(id: string) { return this.installer.uninstallApp(id); }
    pauseDownload(id: string) { return this.installer.pauseDownload(id); }
    resumeDownload(id: string) { return this.installer.resumeDownload(id); }
    cancelDownload(id: string) { return this.installer.cancelDownload(id); }
    
    isDownloadPaused(appId: string): boolean {
        const task = this.state.downloadTasks().find(t => t.app_id === appId);
        return task?.status === 'Paused';
    }

    clearHistoryItem(itemId: string) {
        this.state.downloadHistory.update(history => history.filter(item => item.id !== itemId));
    }

    // Hub Updates
    checkHubUpdate() { 
        const hubAppId = '00000000-0000-0000-0000-000000000000';
        return this.installer.checkHubUpdate(hubAppId); 
    }
    triggerHubUpdate() { return this.installer.triggerHubUpdate(); }

    // Sync & Data
    launchApp(app: any) { return this.navigation.launchApp(app); }
    pullSync(id?: string) { return this.sync.pullSync(id); }
    pushSync(id?: string) { return this.sync.pushSync(id); }
    executeDeepSync(appId?: string) { return this.sync.executeDeepSync(appId); }
    
    // Configuration DB
    saveDbConfig(cfg?: any) { return this.config.saveDbConfig(cfg); }
    testDbConnection(cfg?: any) { return this.config.testDbConnection(cfg); }
    toggleOfflineMode() { this.config.toggleOfflineMode(); }

    // Utils
    isModuleUnlocked(id: string) { return this.state.unlockedModuleIds().includes(id); }
    isAppLicensed(app: any) { return this.data.isAppLicensed(app); }
    isAppOnDisk(id: string) { return this.state.isAppOnDisk(id)(); }
    isAppOwned(id: string) { return this.state.isAppOwned(id)(); }
    isAppInstalling(id: string) { return this.state.isAppInstalling(id)(); }
    isAppRunning(id: string) { return this.state.isAppRunning(id)(); }

    async syncDownloadTasks() {
        return this.installer.syncDownloadTasks();
    }

    refreshTab(id: string) {
        this.state.refreshTabRequestedSource.next(id);
    }
}
