import { Injectable, signal, computed } from '@angular/core';
import { AppManifest, MOCK_APPS } from '../models/app-manifest.mock';
import { delay, of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class HubService {

    // State
    installedApps = signal<AppManifest[]>([]);
    availableApps = signal<AppManifest[]>([]);

    // Computed
    installingApps = computed(() => this.availableApps().filter(a => a.status === 'installing'));

    // Home Page Sections
    featuredApp = computed(() => MOCK_APPS.find(a => a.id === 'school-manager') || MOCK_APPS[0]);
    recentApps = computed(() => [...MOCK_APPS].sort((a, b) => (b.releaseDate?.getTime() || 0) - (a.releaseDate?.getTime() || 0)).slice(0, 3));
    popularApps = computed(() => [...MOCK_APPS].sort((a, b) => (b.installCount || 0) - (a.installCount || 0)).slice(0, 3));

    // Store Section
    featuredModules = computed(() => {
        const modules: any[] = [];
        MOCK_APPS.forEach(app => {
            if (app.modules) {
                app.modules.forEach(m => modules.push({ ...m, appName: app.name, appBanner: app.banner }));
            }
        });
        return modules.slice(0, 4); // Take first 4 for demo
    });

    // Library Section (New)
    mostUsedApp = computed(() => this.installedApps().find(a => a.id === 'school-manager')); // Mock: School Manager is most used
    employeeApps = computed(() => this.installedApps().filter(a => a.userRole === 'employee'));
    managerApps = computed(() => this.installedApps().filter(a => a.userRole === 'manager'));
    appUpdates = computed(() => this.installedApps().filter(a => a.isNewUpdate));

    // Recommendations (Mix of available apps + random logic)
    recommendedApps = computed(() => {
        return MOCK_APPS.filter(a => a.status === 'available').slice(0, 2);
    });

    // Store Section (Ubisoft Style Data)
    storeFeatured = computed(() => [
        {
            title: "GigaCore Cloud Premium",
            subtitle: "Nouvelle Architecture",
            description: "Découvrez la puissance du Cloud synchronisé. Disponible maintenant.",
            image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072",
            price: "29.99€",
            action: "Acheter"
        },
        {
            title: "School Manager 2026",
            subtitle: "Mise à jour majeure",
            description: "La gestion d'établissement réinventée avec l'IA.",
            image: "https://images.unsplash.com/photo-1509062522246-37559cc79279?q=80&w=2000",
            price: "Gratuit",
            action: "Mettre à jour"
        }
    ]);

    storeDeals = computed(() => MOCK_APPS.slice(0, 3).map(a => ({ ...a, oldPrice: '59.99€', price: '29.99€', discount: '-50%' })));
    storeNewReleases = computed(() => MOCK_APPS.slice(2, 5));

    constructor() {
        this.loadApps();
    }

    private loadApps() {
        // Simulate API call
        setTimeout(() => {
            this.installedApps.set(MOCK_APPS.filter(a => a.status === 'installed' || a.status === 'update_available'));
            this.availableApps.set(MOCK_APPS.filter(a => a.status === 'available'));
        }, 800);
    }

    // Simulation: Install App
    installApp(appId: string) {
        // 1. Find App
        const appIndex = this.availableApps().findIndex(a => a.id === appId);
        if (appIndex === -1) return;

        const app = this.availableApps()[appIndex];

        // 2. Move to "Installing"
        this.availableApps.update(apps => {
            const newApps = [...apps];
            newApps[appIndex] = { ...app, status: 'installing', progress: 0 };
            return newApps;
        });

        // 3. Simulate Progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            this.availableApps.update(apps => {
                const idx = apps.findIndex(a => a.id === appId);
                if (idx !== -1) {
                    const updated = [...apps];
                    updated[idx] = { ...updated[idx], progress };
                    return updated;
                }
                return apps;
            });

            if (progress >= 100) {
                clearInterval(interval);
                // 4. Move to Installed
                this.availableApps.update(apps => apps.filter(a => a.id !== appId));
                this.installedApps.update(apps => [...apps, { ...app, status: 'installed', progress: undefined }]);
            }
        }, 200);
    }
}
