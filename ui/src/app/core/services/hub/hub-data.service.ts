import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { HubStateService } from './hub-state.service';
import { invoke } from '@tauri-apps/api/core';
import { MOCK_APPS } from '../../models/app-manifest.mock';
import { Subscription } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class HubDataService {
    private state = inject(HubStateService);
    private supabase = inject(SupabaseService);
    private sub = new Subscription();

    async init() {
        console.log("[HUB_DATA] Initializing data service...");
        this.sub.unsubscribe();
        this.sub = this.supabase.currentUser$.subscribe(async user => {
            console.log("[HUB_DATA] User state changed:", user?.email);
            if (user) {
                try {
                    this.clearData(true);
                    const { data: tenant, error } = await this.supabase.getTenantByEmail(user.email || '');
                    if (error) throw error;
                    
                    if (tenant) {
                        console.log("[HUB_DATA] Tenant found:", tenant.name, "HubID:", tenant.hub_id);
                        this.state.hubId.set(tenant.hub_id);
                        this.state.tenantName.set(tenant.name || 'Mon Établissement');
                        await this.loadHomeSections(tenant.id);
                    } else {
                        console.warn("[HUB_DATA] No tenant found for user", user.email);
                    }
                } catch (e) {
                    console.error("[HUB_DATA] Data init error:", e);
                    this.clearData(true);
                }
            } else {
                console.log("[HUB_DATA] No user, clearing data.");
                this.clearData(true);
            }
        });
    }

    clearData(loadOffline: boolean = true) {
        this.state.hubId.set(null);
        this.state.tenantName.set(null);
        this.state.installedApps.set([]);
        this.state.availableApps.set([]);
        this.state.unlockedModuleIds.set([]);
        this.state.rawLicenses.set([]);
        if (loadOffline) this.loadOfflineData();
    }

    async getCacheKey(): Promise<string> {
        const user = await this.supabase.client.auth.getUser();
        const userId = user.data.user?.id || 'anonymous';
        return `hub-app-cache-${userId}`;
    }

    async loadOfflineData() {
        const key = await this.getCacheKey();
        const cache = localStorage.getItem(key);
        if (cache) {
            try {
                const data = JSON.parse(cache);
                this.state.installedApps.set(data.installed || []);
                this.state.availableApps.set(data.available || []);
                this.state.unlockedModuleIds.set(data.modules || []);
                this.state.bundles.set(data.bundles || []);
                this.state.activePromotions.set(data.promotions || []);
                return;
            } catch (e) {
                console.error("Failed to load hub cache:", e);
            }
        }
        this.state.installedApps.set([]);
        this.state.availableApps.set([]);
        this.state.unlockedModuleIds.set([]);
    }

    async saveCache() {
        const key = await this.getCacheKey();
        const data = {
            installed: this.state.installedApps(),
            available: this.state.availableApps(),
            modules: this.state.unlockedModuleIds(),
            bundles: this.state.bundles(),
            promotions: this.state.activePromotions()
        };
        localStorage.setItem(key, JSON.stringify(data));
    }

    async loadHomeSections(tenantId: string) {
        console.log("[HUB_DATA] Loading home sections for tenant:", tenantId);
        if (this.state.isOffline()) {
            await this.loadOfflineData();
            return;
        }
        this.state.isLoading.set(true);
        try {
            const results = await Promise.allSettled([
                this.supabase.client.from('tenant_licenses').select('*').eq('tenant_id', tenantId),
                this.supabase.client.from('bundles').select('*').eq('is_active', true),
                this.supabase.client.from('promotions').select('*').eq('is_active', true).is('code', null).gt('valid_until', new Date().toISOString()),
                this.supabase.client.from('apps').select('*, modules:app_modules(*)').eq('is_active', true)
            ]);

            const licenses = results[0].status === 'fulfilled' && !results[0].value.error ? results[0].value.data : [];
            const bundles = results[1].status === 'fulfilled' && !results[1].value.error ? results[1].value.data : [];
            const promotions = results[2].status === 'fulfilled' && !results[2].value.error ? results[2].value.data : [];
            const allApps = results[3].status === 'fulfilled' && !results[3].value.error ? results[3].value.data : [];

            console.log("[HUB_DATA] Data fetched from Supabase:", { 
                licenses: licenses?.length, 
                apps: allApps?.length,
                hasError: results.some(r => r.status === 'rejected' || (r as any).value?.error)
            });

            this.state.rawLicenses.set(licenses || []);
            this.state.bundles.set(bundles || []);
            this.state.activePromotions.set(promotions || []);

            if (allApps && allApps.length > 0) {
                const licensedModuleIds = new Set(licenses?.map(l => l.module_id) || []);
                const installed = allApps.filter((app: any) => app.modules?.some((mod: any) => licensedModuleIds.has(mod.id)));

                console.log("[HUB_DATA] Processing apps (licensed:", installed.length, ")");
                
                // On charge les apps disponibles et installées
                const enrichedInstalled = await Promise.all(installed.map(async (a: any) => {
                    let isPhysicallyInstalled = false;
                    try {
                        isPhysicallyInstalled = await invoke<boolean>('is_app_installed', { appId: a.id });
                    } catch (e) { }
                    return { ...a, status: isPhysicallyInstalled ? 'installed' : 'owned', icon: a.icon_svg || '', banner: a.banner_url || '', modules: a.modules || [] };
                }));
                this.state.installedApps.set(enrichedInstalled);

                const installedIds = new Set(installed.map(a => a.id));
                const enrichedAvailable = await Promise.all(allApps.map(async (a: any) => {
                    const isInstalled = installedIds.has(a.id);
                    let isPhysicallyInstalled = false;
                    if (isInstalled) {
                        try {
                            isPhysicallyInstalled = await invoke<boolean>('is_app_installed', { appId: a.id });
                        } catch (e) { }
                    }
                    return { ...a, status: isInstalled ? (isPhysicallyInstalled ? 'installed' : 'owned') : 'available', icon: a.icon_svg || '', banner: a.banner_url || '', modules: a.modules || [] };
                }));
                this.state.availableApps.set(enrichedAvailable);
                
                this.state.unlockedModuleIds.set(Array.from(licensedModuleIds));
                await this.saveCache();
                console.log("[HUB_DATA] Hub UI populated with real data.");
            } else {
                console.warn("[HUB_DATA] Supabase returned no apps, using MOCKS as fallback.");
                this.useMocks();
            }
        } catch (error) {
            console.error('[HUB_DATA] Critical error loading hub data:', error);
            await this.loadOfflineData();
            if (this.state.availableApps().length === 0) this.useMocks();
        } finally {
            this.state.isLoading.set(false);
        }
    }

    private useMocks() {
        this.state.availableApps.set(MOCK_APPS);
        this.state.installedApps.set(MOCK_APPS.filter(a => a.status === 'installed'));
        this.state.unlockedModuleIds.set(['students', 'planning', 'exams', 'finance']);
    }

    isAppLicensed(app: any): boolean {
        if (!app.modules || app.modules.length === 0) return false;
        return app.modules.some((mod: any) => {
            const license = this.state.rawLicenses().find(l => l.module_id === mod.id);
            if (!license) return false;
            if (license.expires_at && new Date(license.expires_at) < new Date()) return false;
            return license.is_active !== false;
        });
    }
}
