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
        this.sub.unsubscribe(); // Nettoyage de l'ancien abonnement
        this.sub = this.supabase.currentUser$.subscribe(async user => {
            if (user) {
                try {
                    this.clearData(false);
                    const { data: tenant, error } = await this.supabase.getTenantByOwner(user.id);
                    if (error) throw error;
                    
                    if (tenant) {
                        this.state.hubId.set(tenant.hub_id);
                        this.state.tenantName.set(tenant.name || 'Mon Établissement');
                        await this.loadHomeSections(tenant.id);
                    }
                } catch (e) {
                    console.error("Data init error:", e);
                    this.clearData(true);
                }
            } else {
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
        if (this.state.isOffline()) {
            await this.loadOfflineData();
            return;
        }
        this.state.isLoading.set(true);
        try {
            // Utilisation de Promise.allSettled pour ne pas tout bloquer si une table est vide ou en erreur
            const results = await Promise.allSettled([
                this.supabase.client.from('tenant_licenses').select('*').eq('tenant_id', tenantId),
                this.supabase.client.from('bundles').select('*').eq('is_active', true),
                this.supabase.client.from('promotions').select('*').eq('is_active', true).is('code', null).gt('valid_until', new Date().toISOString()),
                this.supabase.client.from('apps').select('*, modules:app_modules(*)').eq('is_active', true)
            ]);

            const licenses = results[0].status === 'fulfilled' ? results[0].value.data : [];
            const bundles = results[1].status === 'fulfilled' ? results[1].value.data : [];
            const promotions = results[2].status === 'fulfilled' ? results[2].value.data : [];
            const allApps = results[3].status === 'fulfilled' ? results[3].value.data : [];

            this.state.rawLicenses.set(licenses || []);
            this.state.bundles.set(bundles || []);
            this.state.activePromotions.set(promotions || []);

            if (allApps) {
                const licensedModuleIds = new Set(licenses?.map(l => l.module_id) || []);
                const installed = allApps.filter((app: any) => app.modules?.some((mod: any) => licensedModuleIds.has(mod.id)));

                this.state.installedApps.set(await Promise.all(installed.map(async (a: any) => {
                    const isPhysicallyInstalled = await invoke<boolean>('is_app_installed', { appId: a.id });
                    return { ...a, status: isPhysicallyInstalled ? 'installed' : 'owned', icon: a.icon_svg || '', banner: a.banner_url || '', modules: a.modules || [] };
                })));

                const installedIds = new Set(installed.map(a => a.id));
                this.state.availableApps.set(await Promise.all(allApps.map(async (a: any) => {
                    const isInstalled = installedIds.has(a.id);
                    const isPhysicallyInstalled = isInstalled ? await invoke<boolean>('is_app_installed', { appId: a.id }) : false;
                    return { ...a, status: isInstalled ? (isPhysicallyInstalled ? 'installed' : 'owned') : 'available', icon: a.icon_svg || '', banner: a.banner_url || '', modules: a.modules || [] };
                })));
                this.state.unlockedModuleIds.set(Array.from(licensedModuleIds));
                await this.saveCache();
            }
        } catch (error) {
            console.error('Error loading hub data:', error);
            await this.loadOfflineData();
        } finally {
            this.state.isLoading.set(false);
        }
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
