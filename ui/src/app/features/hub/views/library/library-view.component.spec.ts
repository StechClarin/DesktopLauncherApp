import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LibraryViewComponent } from './library-view.component';
import { HubService } from '../../../../core/services/hub.service';
import { HubStateService } from '../../../../core/services/hub/hub-state.service';
import { MOCK_SUPABASE_PROVIDER } from '../../../../core/services/testing-utils';

describe('LibraryViewComponent', () => {
    let component: LibraryViewComponent;
    let fixture: ComponentFixture<LibraryViewComponent>;
    let state: HubStateService;

    const mockApps = [
        { id: 'a1', name: 'School Manager', description: 'Gestion école', status: 'installed' },
        { id: 'a2', name: 'Kantine Pro', description: 'Restauration', status: 'update_available', isNewUpdate: true },
        { id: 'a3', name: 'Library Pro', description: 'Bibliothèque', status: 'installing' }
    ];

    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [LibraryViewComponent],
            providers: [MOCK_SUPABASE_PROVIDER]
        }).compileComponents();

        state = TestBed.inject(HubStateService);
        state.installedApps.set(mockApps as any);

        fixture = TestBed.createComponent(LibraryViewComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should be created', () => {
        expect(component).toBeTruthy();
    });

    it('should show all installed apps by default', () => {
        expect(component.filteredApps().length).toBe(3);
        expect(component.countAll()).toBe(3);
    });

    it('should filter by "ready" status', () => {
        component.setFilter('ready');
        expect(component.filteredApps().length).toBe(1);
        expect(component.filteredApps()[0].id).toBe('a1');
    });

    it('should filter by "updates" status', () => {
        component.setFilter('updates');
        expect(component.filteredApps().length).toBe(1);
        expect(component.filteredApps()[0].id).toBe('a2');
    });

    it('should filter by "downloads" status', () => {
        component.setFilter('downloads');
        expect(component.filteredApps().length).toBe(1);
        expect(component.filteredApps()[0].id).toBe('a3');
    });

    it('should search by app name', () => {
        component.onSearchChange({ target: { value: 'library' } } as any);
        expect(component.filteredApps().length).toBe(1);
        expect(component.filteredApps()[0].name).toBe('Library Pro');
    });

    it('should search by description', () => {
        component.onSearchChange({ target: { value: 'restauration' } } as any);
        expect(component.filteredApps().length).toBe(1);
        expect(component.filteredApps()[0].id).toBe('a2');
    });

    it('should return no results for unmatched search', () => {
        component.onSearchChange({ target: { value: 'zzzzz' } } as any);
        expect(component.filteredApps().length).toBe(0);
    });

    it('should toggle grid/list view and persist preference', () => {
        component.setLibraryView('list');
        expect(component.libraryViewMode()).toBe('list');
        expect(localStorage.getItem('hub_library_view')).toBe('list');
    });

    it('should restore saved view mode from localStorage', () => {
        localStorage.setItem('hub_library_view', 'list');
        const restored = TestBed.createComponent(LibraryViewComponent);
        const comp = restored.componentInstance;
        expect(comp.libraryViewMode()).toBe('list');
    });

    it('should open app details via hub service', () => {
        const app = mockApps[0];
        component.openAppDetails(app);
        expect(state.selectedApp()).toEqual(app);
    });
});

