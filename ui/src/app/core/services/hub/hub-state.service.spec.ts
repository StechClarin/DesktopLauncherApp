import { TestBed } from '@angular/core/testing';
import { HubStateService } from './hub-state.service';

describe('HubStateService', () => {
    let service: HubStateService;

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        TestBed.configureTestingModule({});
        service = TestBed.inject(HubStateService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should have default hub API key', () => {
        expect(service.hubApiKey()).toBeTruthy();
        expect(service.hubApiKey().length).toBeGreaterThan(0);
    });

    it('should have default cloud API URL', () => {
        expect(service.cloudApiUrl()).toBe('http://127.0.0.1:8000');
    });

    it('should default to solo deployment mode', () => {
        expect(service.deploymentMode()).toBe('solo');
        expect(service.deploymentRole()).toBe('server');
    });

    it('should default to home tab', () => {
        expect(service.activeTab()).toBe('home');
    });

    it('should record app launch history (max 10)', () => {
        for (let i = 0; i < 15; i++) {
            service.recordAppLaunch(`app-${i}`);
        }
        const history = service.launchHistory();
        expect(history.length).toBe(10);
        // Most recent first
        expect(history[0].appId).toBe('app-14');
        // Persisted in localStorage
        const stored = JSON.parse(localStorage.getItem('hub-launch-history') || '[]');
        expect(stored.length).toBe(10);
    });

    it('should not duplicate an app in launch history', () => {
        service.recordAppLaunch('app-x');
        service.recordAppLaunch('app-y');
        service.recordAppLaunch('app-x');
        const ids = service.launchHistory().map(h => h.appId);
        expect(ids.filter(id => id === 'app-x').length).toBe(1);
    });

    it('should expose computed status helpers', () => {
        service.installedApps.set([
            { id: 'a1', status: 'installed' },
            { id: 'a2', status: 'update_available' }
        ]);
        expect(service.isAppOnDisk('a1')()).toBe(true);
        expect(service.isAppOnDisk('a2')()).toBe(true);
        expect(service.isAppOnDisk('missing')()).toBe(false);
        expect(service.isAppOwned('a1')()).toBe(true);
    });

    it('should compute library stats from installed apps', () => {
        service.installedApps.set([
            { id: 'a1', modules: [{ id: 'm1' }, { id: 'm2' }] }
        ]);
        const stats = service.libraryStats();
        expect(stats[0].value).toBe(1); // Applications
        expect(stats[1].value).toBe(2); // Modules actifs
    });

    it('should filter premium modules that are not unlocked', () => {
        const apps = [
            {
                id: 'a1',
                name: 'App A',
                modules: [
                    { id: 'free', is_premium: false },
                    { id: 'locked', is_premium: true }
                ]
            }
        ];
        // enrichedApps lit availableApps ; le filtre installedIds utilise installedApps.
        service.installedApps.set(apps as any);
        service.availableApps.set(apps as any);
        service.unlockedModuleIds.set(['other']);
        const recommendations = service.moduleRecommendations();
        expect(recommendations.length).toBe(1);
        expect(recommendations[0].id).toBe('locked');
    });
});
