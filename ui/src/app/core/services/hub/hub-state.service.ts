import { Injectable, signal, computed } from '@angular/core';
import { DbConfig } from '../../models/hub.models';
import { MOCK_APPS } from '../models/app-manifest.mock';
import { Subject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class HubStateService {
    // Basic Signals
    activeReleases = signal<any[]>([]);
    currentHubVersion = signal<string>('1.0.0'); 
    latestHubVersion = signal<string | null>(null);
    isOffline = signal<boolean>(localStorage.getItem('hub-offline-mode') === 'true');
    
    // API & Security
    hubApiKey = signal<string>((import.meta as any).env?.VITE_HUB_API_KEY || 'ethernanos-hub-secret-2026');
    cloudApiUrl = signal<string>((import.meta as any).env?.VITE_CLOUD_API_URL || 'http://127.0.0.1:8000');

    hubId = signal<string | null>(null);
    tenantName = signal<string | null>(null);
    unlockedModuleIds = signal<string[]>([]);
    installedApps = signal<any[]>([]);
    availableApps = signal<any[]>([]);
    
    bundles = signal<any[]>([]);
    activePromotions = signal<any[]>([]);
    isLoading = signal<boolean>(false);
    rawLicenses = signal<any[]>([]);
    
    // Launch & UX states
    isLaunchingApp = signal<string | null>(null); // Contient l'ID de l'app en cours de lancement
    launchStep = signal<string>(''); // Message d'étape pour l'UX
    
    // Installation states
    downloadingAppId = signal<string | null>(null);
    installProgress = signal<number>(0);
    hubUpdateProgress = signal<number>(0);
    isUpdatingHub = signal<boolean>(false);
    downloadHistory = signal<any[]>([]);
    downloadTasks = signal<any[]>([]);

    // Navigation & UI
    selectedApp = signal<any | null>(null);
    activeTab = signal<'home' | 'library' | 'store' | 'downloads' | 'settings'>((sessionStorage.getItem('hub-active-tab') as any) || 'home');
    activeTabs = signal<{id: string, name: string, url: string, logo?: string, isActive: boolean}[]>([]);
    appPorts = signal<Record<string, number>>({});

    // DB Config
    dbHost = signal<string>('127.0.0.1');
    dbPort = signal<number>(5432);
    dbUser = signal<string>('postgres');
    dbPass = signal<string>('');
    dbConfig = signal<DbConfig | null>(null);
    dbConfigStatus = signal<'checking' | 'connected' | 'error' | null>(null);
    dbConfigError = signal<string | null>(null);
    isSyncing = signal<boolean>(false);

    // Subjects for events
    refreshTabRequestedSource = new Subject<string>();
    refreshTabRequested$ = this.refreshTabRequestedSource.asObservable();

    // Computed Properties
    hasUpdate = computed(() => this.latestHubVersion() !== null && this.latestHubVersion() !== this.currentHubVersion());
    isHubActive = computed(() => !this.activeTabs().some(t => t.isActive));
    runningAppIds = computed(() => new Set(this.activeTabs().map(t => t.id)));

    enrichedApps = computed(() => {
        const apps = this.availableApps();
        const promos = this.activePromotions();
        
        return apps.map(app => {
            const enrichedModules = (app.modules || []).map((mod: any) => {
                const modPromo = promos.find(p => 
                    p.is_active && !p.code && p.module_ids?.includes(mod.id) &&
                    new Date(p.valid_until) > new Date()
                );
                if (!modPromo) return mod;
                const basePrice = mod.price || 19.99;
                let discountLabel = modPromo.discount_type === 'percentage' ? `-${modPromo.discount_value}%` : `-${modPromo.discount_value}€`;
                let finalPrice = modPromo.discount_type === 'percentage' ? basePrice * (1 - modPromo.discount_value / 100) : Math.max(0, basePrice - modPromo.discount_value);
                return { ...mod, hasDiscount: true, discount: discountLabel, oldPrice: `${basePrice.toFixed(2)}€`, price: `${finalPrice.toFixed(2)}€`, finalPriceNumber: finalPrice };
            });

            const activePromo = promos.find(p => p.is_active && !p.code && p.app_ids?.includes(app.id) && new Date(p.valid_until) > new Date());
            const enrichedApp = { ...app, modules: enrichedModules };
            if (!activePromo) return enrichedApp;
            const basePrice = app.base_price || 49.99;
            let discountLabel = activePromo.discount_type === 'percentage' ? `-${activePromo.discount_value}%` : `-${activePromo.discount_value}€`;
            let finalPrice = activePromo.discount_type === 'percentage' ? basePrice * (1 - activePromo.discount_value / 100) : Math.max(0, basePrice - activePromo.discount_value);
            return { ...enrichedApp, hasDiscount: true, discount: discountLabel, oldPrice: `${basePrice.toFixed(2)}€`, price: `${finalPrice.toFixed(2)}€`, finalPriceNumber: finalPrice };
        });
    });

    allApps = computed(() => this.enrichedApps());
    installingApps = computed(() => {
        const appId = this.downloadingAppId();
        if (!appId) return [];
        const app = this.enrichedApps().find(a => a.id === appId);
        const progress = this.installProgress();
        return app ? [{ ...app, status: progress === 101 ? 'initializing' : 'installing', progress }] : [];
    });

    recentApps = computed(() => [...this.enrichedApps()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4));
    popularApps = computed(() => [...this.enrichedApps()].sort((a, b) => (b.installCount || 0) - (a.installCount || 0)).slice(0, 4));
    featuredModules = computed(() => this.enrichedApps().flatMap(app => (app.modules || []).filter((mod: any) => mod.is_premium).map((mod: any) => ({ ...mod, appName: app.name }))).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3));
    featuredApp = computed(() => this.installedApps()[0] || this.enrichedApps()[0]);
    recommendedApps = computed(() => this.enrichedApps().slice(0, 2));
    mostUsedApp = computed(() => this.installedApps()[0]); 
    appUpdates = computed(() => this.installedApps().filter(a => a.isNewUpdate));
    libraryModules = computed(() => this.installedApps().flatMap(app => (app.modules || []).map((mod: any) => ({ ...mod, appName: app.name }))));
    
    libraryCarousel = computed(() => {
        const bundles = this.bundles();
        const apps = this.enrichedApps();
        return [
            ...bundles.slice(0, 2).map(b => ({ id: b.id, type: 'bundle', title: b.name, subtitle: 'Offre Limitée', description: b.description, image: b.banner_url, price: b.price + '€' })),
            ...apps.slice(0, 2).map(a => ({ id: a.id, type: 'app', title: a.name, subtitle: 'Nouvauté', description: a.description, image: a.banner_url || a.banner, price: a.hasDiscount ? a.price : 'À découvrir' }))
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
        const installedIds = new Set(this.installedApps().map(a => a.id));
        const unlockedIds = new Set(this.unlockedModuleIds());
        return this.enrichedApps().filter(app => installedIds.has(app.id)).flatMap(app => (app.modules || []).filter((mod: any) => mod.is_premium && !unlockedIds.has(mod.id)).map((mod: any) => ({ ...mod, parentAppName: app.name, parentAppBanner: app.banner, displayPrice: mod.hasDiscount ? mod.price : (mod.price ? mod.price + '€' : 'Premium') }))).slice(0, 4);
    });

    storeFeatured = computed(() => this.enrichedApps().slice(0, 3).map(app => ({ id: app.id, title: app.name, description: app.description || "Découvrez la puissance de l'écosystème EtherNanos.", image: app.banner_url || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070', action: 'Déverrouiller', price: app.hasDiscount ? app.price : 'Inclus' })));
    storeDeals = computed(() => this.enrichedApps().filter(app => app.hasDiscount).slice(0, 4));
    storeNewReleases = computed(() => [...this.enrichedApps()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3));
    storeModules = computed(() => this.enrichedApps().flatMap(app => (app.modules || []).filter((mod: any) => mod.is_premium).map((mod: any) => ({ ...mod, appName: app.name, displayPrice: mod.hasDiscount ? mod.price : (mod.price ? mod.price + '€' : 'Premium') }))).slice(0, 4));
}
