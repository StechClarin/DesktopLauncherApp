import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { StoreViewComponent } from './store-view.component';
import { HubStateService } from '../../../../core/services/hub/hub-state.service';
import { MOCK_SUPABASE_PROVIDER } from '../../../../core/services/testing-utils';

describe('StoreViewComponent', () => {
    let component: StoreViewComponent;
    let fixture: ComponentFixture<StoreViewComponent>;
    let state: HubStateService;

    const mockApps = [
        { id: 's1', name: 'School Manager', description: 'Gestion', category: 'Productivité', hasDiscount: true, price: 99 },
        { id: 's2', name: 'Kantine Pro', description: 'Restauration', category: 'Modules', hasDiscount: false },
        { id: 's3', name: 'Library Pro', description: 'Bibliothèque', category: 'Utilitaires', hasDiscount: false, isNewUpdate: true }
    ];

    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [StoreViewComponent, NoopAnimationsModule],
            providers: [MOCK_SUPABASE_PROVIDER]
        }).compileComponents();

        state = TestBed.inject(HubStateService);
        state.availableApps.set(mockApps as any);

        fixture = TestBed.createComponent(StoreViewComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should be created', () => {
        expect(component).toBeTruthy();
    });

    it('should show all apps in catalog by default', () => {
        expect(component.filteredCatalog().length).toBe(3);
    });

    it('should filter catalog by category', () => {
        component.setCategory('Modules');
        expect(component.filteredCatalog().length).toBe(1);
        expect(component.filteredCatalog()[0].id).toBe('s2');
    });

    it('should filter catalog by search query', () => {
        component.searchQuery.set('library');
        expect(component.filteredCatalog().length).toBe(1);
        expect(component.filteredCatalog()[0].id).toBe('s3');
    });

    it('should combine search and category filters', () => {
        component.searchQuery.set('pro');
        component.setCategory('Modules');
        expect(component.filteredCatalog().length).toBe(1);
        expect(component.filteredCatalog()[0].id).toBe('s2');
    });

    it('should toggle section visibility', () => {
        expect(component.showDeals()).toBe(true);
        component.toggleDeals();
        expect(component.showDeals()).toBe(false);

        expect(component.showNewReleases()).toBe(true);
        component.toggleNewReleases();
        expect(component.showNewReleases()).toBe(false);

        expect(component.showCatalog()).toBe(true);
        component.toggleCatalog();
        expect(component.showCatalog()).toBe(false);
    });

    it('should switch view mode', () => {
        component.setViewMode('list');
        expect(component.storeViewMode()).toBe('list');
        component.setViewMode('compact');
        expect(component.storeViewMode()).toBe('compact');
    });

    it('should expose default categories', () => {
        expect(component.categories).toContain('Tout');
        expect(component.categories).toContain('Modules');
        expect(component.categories).toContain('Productivité');
    });

    it('should open app details (from full catalog)', () => {
        component.openAppDetails(mockApps[1]);
        // openAppDetails résout l'app enrichie via allApps() (= availableApps enrichies)
        const selected = state.selectedApp();
        expect(selected).toBeTruthy();
        expect(selected.id).toBe('s2');
        expect(selected.name).toBe('Kantine Pro');
    });

    it('should ignore null app in openAppDetails', () => {
        component.openAppDetails(null as any);
        expect(state.selectedApp()).toBeNull();
    });
});

