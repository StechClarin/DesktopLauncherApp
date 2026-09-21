import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppCardComponent } from './app-card.component';
import { HubStateService } from '../../../../core/services/hub/hub-state.service';
import { MOCK_SUPABASE_PROVIDER } from '../../../../core/services/testing-utils';

describe('AppCardComponent', () => {
    let component: AppCardComponent;
    let fixture: ComponentFixture<AppCardComponent>;
    let state: HubStateService;

    const mockApp = {
        id: 'school-manager',
        name: 'SCHOOL MANAGER',
        version: '2.4.0',
        description: 'Gestion d\'établissement',
        icon_svg: '<svg><path d="M0 0"/></svg>',
        status: 'installed',
        installCount: 1200,
        modules: []
    };

    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [AppCardComponent],
            providers: [MOCK_SUPABASE_PROVIDER]
        }).compileComponents();

        state = TestBed.inject(HubStateService);
        state.installedApps.set([mockApp as any]);

        fixture = TestBed.createComponent(AppCardComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('app', mockApp);
        fixture.detectChanges();
    });

    it('should be created', () => {
        expect(component).toBeTruthy();
    });

    it('should expose app data via input signal', () => {
        expect(component.app()).toBeTruthy();
        expect(component.app().name).toBe('SCHOOL MANAGER');
    });

    it('should default to grid mode', () => {
        expect(component.mode()).toBe('grid');
    });

    it('should sanitize SVG icons', () => {
        const safe = component.getSafeSvg('<svg><path/></svg>');
        expect(safe).toBeTruthy();
    });

    it('should launch app via hub service on launchApp', () => {
        const event = new MouseEvent('click');
        const stopSpy = spyOn(event, 'stopPropagation');
        component.launchApp(event, mockApp);
        expect(stopSpy).toHaveBeenCalled();
        expect(state.selectedApp()).toBeNull(); // launchApp ne sélectionne pas
    });

    it('should open installation wizard on installApp', () => {
        const event = new MouseEvent('click');
        component.installApp(event, mockApp);
        expect(state.showInstallationWizard()).toEqual(mockApp);
    });
});


