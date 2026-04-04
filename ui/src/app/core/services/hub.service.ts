import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { BehaviorSubject } from 'rxjs';
import { ToastService } from './toast.service';
import { MOCK_APPS } from '../models/app-manifest.mock';
import { TerminalService } from './terminal.service';

export interface DbConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
}

@Injectable({
    providedIn: 'root'
})
export class HubService {
    activeReleases = signal<any[]>([]);
    
    // Hub Self-Update Signals
    private getMetaEnv(key: string, defaultValue: any): any {
        const meta = import.meta as any;
        return (meta.env && meta.env[key]) || defaultValue;
    }
    
    currentHubVersion = signal<string>(this.getMetaEnv('VITE_HUB_VERSION', '1.0.0'));
    latestHubVersion = signal<string | null>(null);
    hasUpdate = computed(() => this.latestHubVersion() !== null && this.latestHubVersion() !== this.currentHubVersion());
    isOffline = signal<boolean>(localStorage.getItem('hub-offline-mode') === 'true');

    private supabase = inject(SupabaseService);
    private toast = inject(ToastService);
    private terminal = inject(TerminalService);

    constructor() {
        this.init();
        this.initProgressListeners();
    }

    private async initProgressListeners() {
        await listen('download-progress', (event: any) => {
            const { app_id, progress } = event.payload;
            if (this.downloadingAppId() === app_id) {
                this.installProgress.set(progress);
            }
        });

        await listen('hub-update-progress', (event: any) => {
            this.hubUpdateProgress.set(event.payload as number);
        });
    }

    // State
    hubId = signal<string | null>(null);
    tenantName = signal<string | null>(null);
    unlockedModuleIds = signal<string[]>([]);
    installedApps = signal<any[]>([]);
    availableApps = signal<any[]>([]);
    
    bundles = signal<any[]>([]);
    activePromotions = signal<any[]>([]);
    isLoading = signal<boolean>(false);
    rawLicenses = signal<any[]>([]);
    
    // Installation states
    downloadingAppId = signal<string | null>(null);
    installProgress = signal<number>(0);
    hubUpdateProgress = signal<number>(0);
    isUpdatingHub = signal<boolean>(false);
    downloadHistory = signal<any[]>([]);

    // Global Navigation & Selection State
    selectedApp = signal<any | null>(null);
    activeTab = signal<'home' | 'library' | 'store' | 'downloads' | 'settings'>((sessionStorage.getItem('hub-active-tab') as any) || 'home');

    // DB Configuration
    dbHost = signal<string>('127.0.0.1');
    dbPort = signal<number>(5432);
    dbUser = signal<string>('postgres'); // Forced for Industrial v3.4
    dbPass = signal<string>('');
    dbConfig = signal<DbConfig | null>(null);
    dbConfigStatus = signal<'checking' | 'connected' | 'error' | null>(null);
    dbConfigError = signal<string | null>(null);
    isSyncing = signal<boolean>(false);

    // Tab Manager (EtherNanos OS)
    activeTabs = signal<{id: string, name: string, url: string, isActive: boolean}[]>([]);
    appPorts = signal<Record<string, number>>({}); // Track which app is on which port
    isHubActive = computed(() => !this.activeTabs().some(t => t.isActive));
    runningAppIds = computed(() => new Set(this.activeTabs().map(t => t.id)));

    openTab(appId: string, name: string, url: string) {
        this.activeTabs.update(tabs => {
            // Defocus all
            const newTabs = tabs.map(t => ({ ...t, isActive: false }));
            // Check if exists
            const existing = newTabs.find(t => t.id === appId);
            if (existing) {
                existing.isActive = true;
                return newTabs;
            }
            return [...newTabs, { id: appId, name, url, isActive: true }];
        });
    }

    async closeTab(appId: string) {
        // 1. Kill the process in Rust
        try {
            await invoke('kill_app', { appId });
        } catch (e) {
            console.error('Failed to kill app process', e);
        }

        // 2. Remove from tabs and manage focus
        this.activeTabs.update(tabs => {
            const closingTab = tabs.find(t => t.id === appId);
            const newTabs = tabs.filter(t => t.id !== appId);
            
            // If the closing tab was active, we need to pick a new one
            if (closingTab?.isActive) {
                if (newTabs.length > 0) {
                    // Activate the last one
                    newTabs[newTabs.length - 1].isActive = true;
                }
            }
            return newTabs;
        });
    }

    selectTab(appId: string | 'hub') {
        this.activeTabs.update(tabs => tabs.map(t => ({
            ...t,
            isActive: appId !== 'hub' && t.id === appId
        })));
    }

    setActiveTab(tab: 'home' | 'library' | 'store' | 'downloads' | 'settings') {
        this.activeTab.set(tab);
        sessionStorage.setItem('hub-active-tab', tab);
        this.selectedApp.set(null); 
    }

    clearHistoryItem(itemId: string) {
        this.downloadHistory.update(history => history.filter(item => item.id !== itemId));
    }

    toggleOfflineMode() {
        const newVal = !this.isOffline();
        this.isOffline.set(newVal);
        localStorage.setItem('hub-offline-mode', String(newVal));
        this.toast.show('info', newVal ? 'Mode Hors-ligne activé' : 'Mode En-ligne activé');

        if (!newVal) {
            // Trigger a fresh fetch from Supabase
            this.refreshOnlineData();
        } else {
            this.loadOfflineData();
        }
    }

    // Check if app is physically on disk
    isAppOnDisk(appId: string): boolean {
        const app = this.installedApps().find(a => a.id === appId) || 
                    this.availableApps().find(a => a.id === appId);
        return app?.status === 'installed';
    }

    isAppOwned(appId: string): boolean {
        const app = this.installedApps().find(a => a.id === appId) || 
                    this.availableApps().find(a => a.id === appId);
        return app?.status === 'owned';
    }

    private async refreshOnlineData() {
        const user = await this.supabase.client.auth.getUser();
        if (user.data.user) {
            const { data: tenant } = await this.supabase.getTenantByOwner(user.data.user.id);
            if (tenant) {
                this.hubId.set(tenant.hub_id);
                this.tenantName.set(tenant.name || 'Mon Établissement');
                await this.loadHomeSections(tenant.id);
            }
        }
    }

    navigateToModuleApp(module: any) {
        const app = this.installedApps().find(a => a.id === module.app_id) || 
                    this.availableApps().find(a => a.id === module.app_id);
        
        if (app) {
            this.selectedApp.set(app);
        }
    }

    async loadDbConfig() {
        try {
            const config = await invoke<DbConfig | null>('get_db_config');
            if (config) {
                this.dbConfig.set(config);
            }
        } catch (e) {
            console.error('Failed to load DB config', e);
        }
    }

    async saveDbConfig(config?: DbConfig) {
        const targetConfig = config || {
            host: this.dbHost(),
            port: this.dbPort(),
            user: this.dbUser(),
            pass: this.dbPass()
        };
        try {
            await invoke('save_db_config', { config: targetConfig });
            this.dbConfig.set(targetConfig);
            this.toast.success('Configuration de la base de données sauvegardée !');
        } catch (e) {
            console.error('Failed to save DB config', e);
            this.toast.error('Échec de la sauvegarde de la configuration.');
            throw e;
        }
    }

    async testDbConnection(config?: DbConfig): Promise<string> {
        const targetConfig = config || {
            host: this.dbHost(),
            port: this.dbPort(),
            user: this.dbUser(),
            pass: this.dbPass()
        };
        try {
            this.dbConfigStatus.set('checking');
            this.dbConfigError.set(null);
            const result = await invoke<string>('test_db_connection', { config: targetConfig });
            this.dbConfigStatus.set('connected');
            this.toast.success('Connexion à la base de données établie !');
            return result;
        } catch (e: any) {
            console.error('DB Connection Test Error:', e);
            this.dbConfigStatus.set('error');
            
            let friendlyMessage = 'Impossible de se connecter à la base de données.';
            const errorStr = e.toString().toLowerCase();
            
            if (errorStr.includes('password authentication failed')) {
                friendlyMessage = 'Utilisateur ou mot de passe PostgreSQL incorrect.';
            } else if (errorStr.includes('connection refused') || errorStr.includes('is the server running')) {
                friendlyMessage = 'Serveur PostgreSQL introuvable. Vérifiez qu\'il est bien lancé.';
            } else if (errorStr.includes('timeout')) {
                friendlyMessage = 'La connexion a expiré. Vérifiez votre réseau.';
            }
            
            this.dbConfigError.set(friendlyMessage);
            this.toast.error(friendlyMessage);
            throw e;
        }
    }

    isModuleUnlocked(moduleId: string): boolean {
        return this.unlockedModuleIds().includes(moduleId);
    }

    isAppLicensed(app: any): boolean {
        // A license is valid if the app has at least one module licensed
        // and that license is active and not expired.
        if (!app.modules || app.modules.length === 0) return false;
        
        return app.modules.some((mod: any) => {
            const license = this.rawLicenses().find(l => l.module_id === mod.id);
            if (!license) return false;
            
            // Check expiry if field exists
            if (license.expires_at && new Date(license.expires_at) < new Date()) return false;
            
            // Check is_active if field exists (default to true)
            return license.is_active !== false;
        });
    }

    // Computed
    enrichedApps = computed(() => {
        const apps = this.availableApps();
        const promos = this.activePromotions();
        
        return apps.map(app => {
            // 1. Enrich nested modules first
            const enrichedModules = (app.modules || []).map((mod: any) => {
                const modPromo = promos.find(p => 
                    p.is_active && 
                    !p.code && 
                    p.module_ids?.includes(mod.id) &&
                    new Date(p.valid_until) > new Date()
                );

                if (!modPromo) return mod;

                const basePrice = mod.price || 19.99;
                let discountLabel = '';
                let finalPrice = basePrice;
                
                if (modPromo.discount_type === 'percentage') {
                    discountLabel = `-${modPromo.discount_value}%`;
                    finalPrice = basePrice * (1 - modPromo.discount_value / 100);
                } else {
                    discountLabel = `-${modPromo.discount_value}€`;
                    finalPrice = Math.max(0, basePrice - modPromo.discount_value);
                }

                return {
                    ...mod,
                    hasDiscount: true,
                    discount: discountLabel,
                    oldPrice: `${basePrice.toFixed(2)}€`,
                    price: `${finalPrice.toFixed(2)}€`,
                    finalPriceNumber: finalPrice
                };
            });

            // 2. Enrich the app itself
            const activePromo = promos.find(p => 
                p.is_active && 
                !p.code && 
                p.app_ids?.includes(app.id) &&
                new Date(p.valid_until) > new Date()
            );

            const enrichedApp = { ...app, modules: enrichedModules };

            if (!activePromo) return enrichedApp;

            const basePrice = app.base_price || 49.99;
            let discountLabel = '';
            let finalPrice = basePrice;
            
            if (activePromo.discount_type === 'percentage') {
                discountLabel = `-${activePromo.discount_value}%`;
                finalPrice = basePrice * (1 - activePromo.discount_value / 100);
            } else {
                discountLabel = `-${activePromo.discount_value}€`;
                finalPrice = Math.max(0, basePrice - activePromo.discount_value);
            }

            return {
                ...enrichedApp,
                hasDiscount: true,
                discount: discountLabel,
                oldPrice: `${basePrice.toFixed(2)}€`,
                price: `${finalPrice.toFixed(2)}€`,
                finalPriceNumber: finalPrice
            };
        });
    });

    allApps = computed(() => this.enrichedApps());

    installingApps = computed(() => {
        const appId = this.downloadingAppId();
        if (!appId) return [];
        const app = this.enrichedApps().find(a => a.id === appId);
        const progress = this.installProgress();
        const status = progress === 101 ? 'initializing' : 'installing';
        return app ? [{ ...app, status: status, progress }] : [];
    });

    recentApps = computed(() => {
        return [...this.enrichedApps()]
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 4);
    });

    popularApps = computed(() => {
        return [...this.enrichedApps()]
            .sort((a: any, b: any) => (b.installCount || 0) - (a.installCount || 0))
            .slice(0, 4);
    });

    featuredModules = computed(() => {
        return this.enrichedApps().flatMap((app: any) => 
            (app.modules || [])
                .filter((mod: any) => mod.is_premium)
                .map((mod: any) => ({
                    ...mod,
                    appName: app.name
                }))
        ).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
    });

    featuredApp = computed(() => this.installedApps()[0] || this.enrichedApps()[0]);
    
    recommendedApps = computed(() => {
        return this.enrichedApps().slice(0, 2);
    });

    mostUsedApp = computed(() => this.installedApps()[0]); 
    appUpdates = computed(() => this.installedApps().filter(a => a.isNewUpdate));

    libraryModules = computed(() => {
        return this.installedApps().flatMap(app => 
            (app.modules || []).map((mod: any) => ({
                ...mod,
                appName: app.name
            }))
        );
    });

    openStoreItem(appId: string) {
        const app = this.enrichedApps().find(a => a.id === appId) || 
                    this.installedApps().find(a => a.id === appId);
        if (app) {
            this.selectedApp.set(app);
            this.activeTab.set('store');
        }
    }

    // Legendary Library 2.0 Signals
    libraryCarousel = computed(() => {
        const bundles = this.bundles();
        const apps = this.enrichedApps();
        
        // Combine bundles and some available apps for the hero carousel
        return [
            ...bundles.slice(0, 2).map(b => ({
                id: b.id,
                type: 'bundle',
                title: b.name,
                subtitle: 'Offre Limitée',
                description: b.description,
                image: b.banner_url,
                price: b.price + '€'
            })),
            ...apps.slice(0, 2).map(a => ({
                id: a.id,
                type: 'app',
                title: a.name,
                subtitle: 'Nouvauté',
                description: a.description,
                image: a.banner_url || a.banner,
                price: a.hasDiscount ? a.price : 'À découvrir'
            }))
        ];
    });

    libraryStats = computed(() => {
        const appsCount = this.installedApps().length;
        const totalModules = this.installedApps().reduce((acc, app) => acc + (app.modules?.length || 0), 0);
        
        return [
            { label: 'Applications', value: appsCount, icon: 'apps', color: 'blue' },
            { label: 'Modules Actifs', value: totalModules, icon: 'extension', color: 'purple' },
            { label: 'Heures ce mois', value: 124, icon: 'schedule', color: 'orange' },
            { label: 'Productivité', value: '+12%', icon: 'trending_up', color: 'green' }
        ];
    });

    moduleRecommendations = computed(() => {
        // Find premium modules of already installed apps that are NOT yet unlocked
        const installedIds = new Set(this.installedApps().map(a => a.id));
        const unlockedIds = new Set(this.unlockedModuleIds());

        return this.enrichedApps()
            .filter((app: any) => installedIds.has(app.id))
            .flatMap((app: any) => 
                (app.modules || [])
                    .filter((mod: any) => mod.is_premium && !unlockedIds.has(mod.id))
                    .map((mod: any) => ({
                        ...mod,
                        parentAppName: app.name,
                        parentAppBanner: app.banner,
                        displayPrice: mod.hasDiscount ? mod.price : (mod.price ? mod.price + '€' : 'Premium')
                    }))
            )
            .slice(0, 4);
    });
    
    // Store Section Signals
    storeFeatured = computed(() => {
        const apps = this.enrichedApps();
        if (apps.length === 0) return [];
        return apps.slice(0, 3).map(app => ({
            id: app.id,
            title: app.name,
            description: app.description || "Découvrez la puissance de l'écosystème EtherNanos.",
            image: app.banner_url || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070',
            action: 'Déverrouiller',
            price: app.hasDiscount ? app.price : 'Inclus'
        }));
    });

    storeDeals = computed(() => {
        return this.enrichedApps()
            .filter(app => app.hasDiscount)
            .slice(0, 4);
    });

    storeNewReleases = computed(() => {
        return [...this.enrichedApps()]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 3);
    });

    storeModules = computed(() => {
        return this.enrichedApps().flatMap((app: any) => 
            (app.modules || [])
                .filter((mod: any) => mod.is_premium)
                .map((mod: any) => ({
                    ...mod,
                    appName: app.name,
                    displayPrice: mod.hasDiscount ? mod.price : (mod.price ? mod.price + '€' : 'Premium')
                }))
        ).slice(0, 4);
    });

    private isInitializing = false;

    private async init() {
        if (this.isInitializing) return;
        this.isInitializing = true;

        await this.loadDbConfig();
        
        // Use a more robust subscription to avoid redundant calls during auth stabilization
        this.supabase.currentUser$.subscribe(async user => {
            if (user) {
                try {
                    const { data: tenant, error } = await this.supabase.getTenantByOwner(user.id);
                    if (error) throw error;
                    
                    if (tenant) {
                        this.hubId.set(tenant.hub_id);
                        this.tenantName.set(tenant.name || 'Mon Établissement');
                        await this.loadHomeSections(tenant.id);
                        
                        if (tenant.hub_id) {
                            this.checkHubUpdate(tenant.hub_id);
                        }
                        
                        // SYNC: Persistence across reloads
                        await this.syncActiveApps();
                    }
                } catch (e) {
                    console.error("Initialization error for user:", e);
                    this.clearData();
                    this.isLoading.set(false);
                }
            } else {
                this.hubId.set(null);
                this.loadOfflineData();
                this.isLoading.set(false);
            }
        });
    }

    async syncActiveApps() {
        try {
            const apps: any[] = await invoke('get_active_apps');
            if (apps && apps.length > 0) {
                this.activeTabs.update(tabs => {
                    const newTabs = [...tabs];
                    apps.forEach(app => {
                        if (!newTabs.find(t => t.id === app.id)) {
                            newTabs.push({ 
                                id: app.id, 
                                name: app.name, 
                                url: `http://127.0.0.1:${app.port}`, 
                                isActive: false 
                            });
                        }
                    });
                    return newTabs;
                });
            }
        } catch (e) {
            console.error('Failed to sync active apps', e);
        }
    }

    private clearData() {
        this.loadOfflineData();
    }

    private loadOfflineData() {
        const cache = localStorage.getItem('hub-app-cache');
        if (cache) {
            try {
                const data = JSON.parse(cache);
                this.installedApps.set(data.installed || []);
                this.availableApps.set(data.available || []);
                this.unlockedModuleIds.set(data.modules || []);
                this.bundles.set(data.bundles || []);
                this.activePromotions.set(data.promotions || []);
                return;
            } catch (e) {
                console.error("Failed to load hub cache:", e);
            }
        }
        
        // Fallback to MOCK if no cache
        this.installedApps.set(MOCK_APPS.filter(a => a.status === 'installed'));
        this.availableApps.set(MOCK_APPS);
        this.unlockedModuleIds.set(['students', 'planning', 'exams', 'finance']);
        this.bundles.set([]);
    }

    private saveCache() {
        const data = {
            installed: this.installedApps(),
            available: this.availableApps(),
            modules: this.unlockedModuleIds(),
            bundles: this.bundles(),
            promotions: this.activePromotions()
        };
        localStorage.setItem('hub-app-cache', JSON.stringify(data));
    }

    async checkLocalInstallation(appId: string): Promise<boolean> {
        try {
            return await invoke<boolean>('is_app_installed', { appId });
        } catch (e) {
            console.error('Failed to check installation for', appId, e);
            return false;
        }
    }

    private async loadHomeSections(tenantId: string) {
        if (this.isOffline()) {
            this.loadOfflineData();
            return;
        }
        this.isLoading.set(true);
        try {
            const { data: licenses } = await this.supabase.client
                .from('tenant_licenses')
                .select('*')
                .eq('tenant_id', tenantId);

            this.rawLicenses.set(licenses || []);

            const { data: bundles } = await this.supabase.client
                .from('bundles')
                .select('*')
                .eq('is_active', true);

            this.bundles.set(bundles || []);

            const { data: promotions } = await this.supabase.client
                .from('promotions')
                .select('*')
                .eq('is_active', true)
                .is('code', null)
                .gt('valid_until', new Date().toISOString());

            this.activePromotions.set(promotions || []);

            const { data: allApps } = await this.supabase.client
                .from('apps')
                .select('*, modules:app_modules(*)')
                .eq('is_active', true);

            if (allApps) {
                const licensedModuleIds = new Set(licenses?.map(l => l.module_id) || []);
                const installed = allApps.filter((app: any) => 
                    app.modules?.some((mod: any) => licensedModuleIds.has(mod.id))
                );

                this.installedApps.set(await Promise.all(installed.map(async (a: any) => {
                    const isPhysicallyInstalled = await this.checkLocalInstallation(a.id);
                    return {
                        ...a,
                        status: isPhysicallyInstalled ? 'installed' : 'owned',
                        icon: a.icon_svg || '',
                        banner: a.banner_url || '',
                        modules: a.modules || []
                    };
                })));

                const installedIds = new Set(installed.map(a => a.id));
                this.availableApps.set(await Promise.all(allApps.map(async (a: any) => {
                    const isInstalled = installedIds.has(a.id);
                    const isPhysicallyInstalled = isInstalled ? await this.checkLocalInstallation(a.id) : false;
                    
                    return {
                        ...a,
                        status: isInstalled ? (isPhysicallyInstalled ? 'installed' : 'owned') : 'available',
                        icon: a.icon_svg || '',
                        banner: a.banner_url || '',
                        modules: a.modules || []
                    };
                })));
                this.unlockedModuleIds.set(Array.from(licensedModuleIds));
                this.saveCache();
            } else {
                // FALLBACK TO MOCK DATA IF NO DATA FROM SUPABASE
                this.installedApps.set(MOCK_APPS.filter(a => a.status === 'installed'));
                this.availableApps.set(MOCK_APPS);
                this.unlockedModuleIds.set(['students', 'planning', 'exams', 'finance']);
            }
        } catch (error) {
            console.error('Error loading hub data:', error);
            this.loadOfflineData();
        } finally {
            this.isLoading.set(false);
        }
    }

    private getOsKeyword(): string {
        // Retourne la valeur de plateforme standard attendue en base de données
        return navigator.userAgent.toLowerCase().includes('win') ? 'windows-latest' : 'ubuntu-latest';
    }

    async installApp(appId: string) {
        if (this.downloadingAppId()) return;

        try {
            this.downloadingAppId.set(appId);
            this.installProgress.set(0);

            const { data: release, error } = await this.supabase.client
                .from('app_releases')
                .select('version, download_url, checksum')
                .eq('app_id', appId)
                .eq('platform', this.getOsKeyword())
                .order('released_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !release) {
                console.error('Supabase error finding release:', error);
                this.toast.error("Impossible de trouver la version pour cette application.");
                this.downloadingAppId.set(null);
                return;
            }

            console.log(`Starting real download for ${appId} from ${release.download_url}`);
            try {
                // Phase 1: Download & Extract
                this.toast.info(`Étape 1/3 : Téléchargement et extraction de ${appId}...`);
                await invoke('download_app', { 
                    appId: appId, 
                    url: release.download_url,
                    checksum: release.checksum
                });
                
                const config = this.dbConfig();
                if (config) {
                    // Phase 2: Create Infrastructure (Database ONLY)
                    this.installProgress.set(101); // Special visual state
                    this.toast.info(`Étape 2/3 : Création de l'infrastructure SQL pour ${appId}...`);
                    await invoke('initialize_database', {
                        config: config,
                        appId: appId
                    });
                    
                    // Phase 3: Initialize Application (Migrations & Seeds)
                    this.installProgress.set(102); // Special visual state
                    this.toast.info(`Étape 3/3 : Initialisation et configuration finale de ${appId}...`);
                    await invoke('run_app_setup', {
                        appId: appId,
                        tenantId: this.hubId(),
                        config: config
                    });
                    
                    this.toast.success(`Installation de ${appId} terminée avec succès !`);
                } else {
                    this.toast.info(`Note : Aucune configuration base de données trouvée. L'application pourrait ne pas fonctionner.`);
                }
                
                this.finalizeInstallation(appId, release.version);
            } catch (err) {
                console.error("Installation sequence error:", err);
                this.toast.error(`Échec de l'installation : ${err}`, 8000);
                this.downloadingAppId.set(null);
            }
        } catch (e) {
            console.error('Installation failed:', e);
            this.downloadingAppId.set(null);
        }
    }

    private finalizeInstallation(appId: string, version: string) {
        const app = this.availableApps().find(a => a.id === appId);
        if (app) {
            this.availableApps.update(apps => apps.filter(a => a.id !== appId));
            this.installedApps.update(apps => [...apps, { ...app, status: 'installed' }]);
            
            this.downloadHistory.update(history => [
                {
                    id: appId,
                    name: app.name,
                    version: version,
                    date: new Date().toISOString(),
                    status: 'completed'
                },
                ...history
            ]);
        }
        this.downloadingAppId.set(null);
        this.installProgress.set(0);
    }

    async launchApp(app: any) {
        console.log(`Preparing launch for app: ${app.name}`);
        
        // Open debug console
        this.terminal.setActiveApp(app.id);
        this.terminal.clear(app.id);
        this.terminal.open();
        
        try {
            // 1. Get current session data
            const user = (await this.supabase.client.auth.getSession()).data.session?.user;
            if (!user || !this.hubId()) {
                this.toast.error("Session invalide. Veuillez vous reconnecter.");
                return;
            }

            // 2. Check if already running
            if (this.runningAppIds().has(app.id)) {
                console.log(`App ${app.id} is already running, switching to tab.`);
                this.openTab(app.id, app.name, ""); 
                return;
            }

            // 3. Execute the app
            this.toast.info(`Démarrage de ${app.name}...`);
            const actualPort = await invoke<number>('execute_app', {
                appId: app.id,
                tenantId: this.hubId()
            });

            this.appPorts.update(p => ({ ...p, [app.id]: actualPort }));
            console.log(`Application lancée sur le port dynamique : ${actualPort}`);

            // --- REACTIVE v2.0 READY SIGNAL ---
            // On attend que l'application nous dise "JE SUIS PRÊTE" au lieu de pinger
            this.toast.info(`Initialisation de ${app.name}...`);
            
            const isReady = await new Promise<boolean>((resolve) => {
                const timeout = setTimeout(() => {
                    sub.unsubscribe();
                    resolve(false);
                }, 30000); // 30s Safety Timeout

                const sub = this.terminal.ready$.subscribe(ready => {
                    if (ready && ready.appId === app.id) {
                        clearTimeout(timeout);
                        sub.unsubscribe();
                        resolve(true);
                    }
                });
            });
            
            if (isReady) {
                const localAppUrl = `http://127.0.0.1:${actualPort}`;
                this.openTab(app.id, app.name, localAppUrl);
                
                // Trigger initial sync
                this.pullSync(app.id); 
            } else {
                throw new Error(`L'application ${app.name} n'a pas envoyé de signal READY après 30s.`);
            }

        } catch (error) {
            console.error('Launch failed:', error);
            this.toast.error(`Erreur au lancement : ${error}`, 6000);
        }
    }

    async pullSync(appId?: string) {
        const id = appId || this.selectedApp()?.id;
        if (!id) return;

        const port = this.appPorts()[id] || 8000;
        this.isSyncing.set(true);
        this.toast.info(`Initialisation du tirage profond (Port ${port})...`);
        try {
            const user = (await this.supabase.client.auth.getSession()).data.session?.user;
            if (!user || !this.hubId()) {
                this.toast.error("Session ou Hub ID manquant.");
                return;
            }

            // 1. Fetch from CLOUD (Django API)
            const cloudApiUrl = this.getMetaEnv('VITE_CLOUD_API_URL', 'http://127.0.0.1:8000'); 
            const apiKey = this.getMetaEnv('VITE_HUB_API_KEY', 'ethernanos-hub-secret-2026');

            this.toast.info("Récupération des données distantes...");
            const cloudResponse = await fetch(`${cloudApiUrl}/api/external/sync-tenant/?tenant_id=${this.hubId()}`, {
                headers: { 'X-Hub-Api-Key': apiKey }
            });

            if (!cloudResponse.ok) throw new Error("Erreur lors de l'accès au Cloud.");
            const deepData = await cloudResponse.json();

            // 2. Push to LOCAL (Django API)
            this.toast.info(`Injection dans l'application locale (127.0.0.1:${port})...`);
            const localResponse = await fetch(`http://127.0.0.1:${port}/api/external/sync-in/`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Hub-Api-Key': apiKey 
                },
                body: JSON.stringify(deepData)
            });

            if (!localResponse.ok) throw new Error("Erreur lors de l'injection locale.");

            this.toast.success("Synchronisation Entrante (Pull) réussie ! Vos données locales sont à jour.");
            await this.loadHomeSections(this.hubId()!);
        } catch (e) {
            console.error("Pull Sync Error:", e);
            this.toast.error(`Échec du tirage : ${e}`);
        } finally {
            this.isSyncing.set(false);
        }
    }

    async pushSync(appId?: string) {
        const id = appId || this.selectedApp()?.id;
        if (!id) return;

        const port = this.appPorts()[id] || 8000;
        this.isSyncing.set(true);
        this.toast.info(`Préparation de l'envoi vers le Cloud (Port ${port})...`);
        try {
            const meta = import.meta as any;
            const apiKey = (meta.env && meta.env.VITE_HUB_API_KEY) || 'ethernanos-hub-secret-2026';
            const cloudApiUrl = this.getMetaEnv('VITE_CLOUD_API_URL', 'http://127.0.0.1:8000');

            // 1. Fetch Deltas from LOCAL
            this.toast.info("Extraction des modifications locales...");
            const deltaResponse = await fetch(`http://127.0.0.1:${port}/api/external/sync-delta/`, {
                headers: { 'X-Hub-Api-Key': apiKey }
            });

            if (!deltaResponse.ok) throw new Error("Impossible de lire les deltas locaux.");
            const deltas = await deltaResponse.json();

            if (!deltas || deltas.length === 0) {
                this.toast.info("Aucune modification locale à envoyer.");
                return true;
            }

            // 2. Send Deltas to CLOUD
            this.toast.info(`Envoi de ${deltas.length} modifications...`);
            const cloudPushResponse = await fetch(`${cloudApiUrl}/api/external/push-delta/`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Hub-Api-Key': apiKey 
                },
                body: JSON.stringify({ deltas })
            });

            if (!cloudPushResponse.ok) throw new Error("Le Cloud a refusé les modifications.");

            // 3. Mark Deltas as Synced LOCALLY
            await fetch(`http://127.0.0.1:${port}/api/external/sync-delta/`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Hub-Api-Key': apiKey 
                },
                body: JSON.stringify({ ids: deltas.map((d: any) => d.id) })
            });

            this.toast.success(`Synchronisation Sortante (Push) réussie ! ${deltas.length} modifications sauvegardées.`);
            return true;
        } catch (e: any) {
            console.error("Push Sync Error:", e);
            if (e instanceof TypeError && e.message.includes('fetch')) {
                this.toast.error("Échec de l'envoi : Le serveur local (port 8000) semble hors-ligne.");
            } else {
                this.toast.error(`Échec de l'envoi : ${e.message || e}`);
            }
            return false;
        } finally {
            this.isSyncing.set(false);
        }
    }

    async uninstallApp(appId: string) {
        const app = [...this.installedApps(), ...this.availableApps()].find(a => a.id === appId);
        if (!app) return;

        try {
            this.isLoading.set(true);
            this.toast.info(`Désinstallation de ${app.name}...`);

            // 1. PUSH to cloud if online (Safety Backup)
            if (navigator.onLine && app.status === 'installed') {
                this.toast.info("Sauvegarde des données vers le Cloud avant suppression...");
                await this.pushSync(appId);
            }

            // 2. TAURI Invoke: Delete DB & Files
            const config = this.dbConfig();
            if (config) {
                await invoke('uninstall_app', { 
                    config: config, 
                    appId: appId 
                });
            } else {
                // Secondary attempt to just wipe files if no DB config
                console.warn("No DB config to drop database, trying file wipe only.");
                /* In reality, Rust uninstall_app handles missing db.json gracefully */
                await invoke('uninstall_app', { 
                    config: { host:'', port:0, user:'', pass:'' }, 
                    appId: appId 
                });
            }

            // 3. Update Local State
            this.installedApps.update(apps => apps.filter(a => a.id !== appId));
            this.availableApps.update(apps => {
                const alreadyExists = apps.some(a => a.id === appId);
                if (alreadyExists) return apps;
                return [...apps, { ...app, status: 'available' }];
            });
            
            this.downloadHistory.update(history => [
                {
                    id: `del-${appId}-${Date.now()}`,
                    name: app.name,
                    version: app.version || 'unknown',
                    date: new Date().toISOString(),
                    status: 'removed'
                },
                ...history
            ]);

            this.toast.success(`L'application ${app.name} a été intégralement supprimée (Fichiers & Base de données).`);
        } catch (e) {
            console.error('Uninstallation failed:', e);
            this.toast.error(`Erreur lors de la désinstallation : ${e}`);
        } finally {
            this.isLoading.set(false);
        }
    }

    async checkHubUpdate(providedAppId?: string) {
        // Use provided ID or fallback to env, cleaning any potential quotes from Vite/Docker
        let hubAppId = providedAppId || this.getMetaEnv('VITE_HUB_APP_ID', '00000000-0000-0000-0000-000000000000');
        hubAppId = hubAppId.replace(/['"]+/g, ''); // Remove quotes

        // Robust check for UUID format to avoid 400 Bad Request
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(hubAppId) || hubAppId === '00000000-0000-0000-0000-000000000000') {
            console.warn('Skipping Hub update check: Invalid or dummy App ID:', hubAppId);
            return;
        }

        try {
            const { data, error } = await this.supabase.client
                .from('app_releases')
                .select('version, checksum')
                .eq('app_id', hubAppId)
                .order('released_at', { ascending: false })
                .limit(1)
                .single();

            if (!error && data?.version && data.version !== this.currentHubVersion()) {
                this.latestHubVersion.set(data.version);
            }
        } catch (e) {
            console.error('Failed to check for hub updates:', e);
        }
    }

    async triggerHubUpdate() {
        if (this.isUpdatingHub()) return;
        
        const rawId = this.getMetaEnv('VITE_HUB_APP_ID', '00000000-0000-0000-0000-000000000000');
        const hubAppId = (rawId as string)?.replace(/['\"]+/g, '');
        if (!hubAppId) {
            this.toast.error("Impossible de trouver l'ID du Hub.");
            return;
        }

        try {
            this.isUpdatingHub.set(true);
            this.hubUpdateProgress.set(0);

            // 1. Get latest release again to be sure (Filtered by OS)
            const { data: release, error } = await this.supabase.client
                .from('app_releases')
                .select('download_url, checksum')
                .eq('app_id', hubAppId)
                .eq('platform', this.getOsKeyword())
                .order('released_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !release) {
                this.toast.error("Échec de récupération de la mise à jour.");
                this.isUpdatingHub.set(false);
                return;
            }

            // 2. Start update via Tauri
            this.toast.info("Téléchargement de la mise à jour du Hub...");
            const result = await invoke('update_hub', { 
                url: release.download_url,
                checksum: release.checksum
            });

            this.toast.success(result as string);
            
            // 3. Ready to restart - In a real scenario, we'd trigger a restart here
            this.toast.info("Prêt ! Le Hub va redémarrer pour appliquer la mise à jour.");
            
        } catch (e) {
            console.error('Hub update failed:', e);
            this.toast.error(`Erreur de mise à jour : ${e}`);
        } finally {
            this.isUpdatingHub.set(false);
        }
    }
}
