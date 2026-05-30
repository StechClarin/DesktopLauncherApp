import { Component, computed, inject, signal, OnInit, OnDestroy, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs'; // <--- AJOUTé Subscription
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HubService } from '../../core/services/hub.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { HubNavigationService } from '../../core/services/hub/hub-navigation.service';
import { ToastService } from '../../core/services/toast.service';
import { toSignal } from '@angular/core/rxjs-interop';

import { HubHeaderComponent } from '../../features/hub/components/hub-header/hub-header.component';
import { HubSidebarComponent } from '../../features/hub/components/hub-sidebar/hub-sidebar.component';
import { HomeViewComponent } from '../../features/hub/views/home/home-view.component';
import { LibraryViewComponent } from '../../features/hub/views/library/library-view.component';
import { StoreViewComponent } from '../../features/hub/views/store/store-view.component';
import { DownloadsViewComponent } from '../../features/hub/views/downloads/downloads-view.component';
import { SettingsViewComponent } from '../../features/hub/views/settings/settings-view.component';
import { AppDetailViewComponent } from '../../features/hub/views/app-detail/app-detail-view.component';
import { InstallationWizardComponent } from '../../features/hub/components/installation-wizard/installation-wizard.component';
import { SyncDebugDrawerComponent } from '../../features/hub/components/sync-debug-drawer/sync-debug-drawer.component';

@Component({
    selector: 'app-hub-layout',
    standalone: true,
    imports: [
        CommonModule, 
        HubHeaderComponent, 
        HubSidebarComponent,
        HomeViewComponent,
        LibraryViewComponent,
        StoreViewComponent,
        DownloadsViewComponent,
        SettingsViewComponent,
        AppDetailViewComponent,
        InstallationWizardComponent,
        SyncDebugDrawerComponent
    ],
    templateUrl: './hub-layout.component.html',
    styleUrl: './hub-layout.component.scss'
})
export class HubLayoutComponent {
    hubService = inject(HubService);
    supabase = inject(SupabaseService);
    sanitizer = inject(DomSanitizer);
    router = inject(Router);
    hubNavigation = inject(HubNavigationService);
    private sub = new Subscription();

    @ViewChildren('appIframe') iframes!: QueryList<ElementRef<HTMLIFrameElement>>;

    user = toSignal(this.supabase.currentUser$);
    isSidebarOpen = signal<boolean>(true);

    constructor() {
        this.sub.add(
            this.hubService.refreshTabRequested$.subscribe((appId: string) => {
                this.refreshIframe(appId);
            })
        );
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }

    private refreshIframe(appId: string) {
        const iframeArray = this.iframes?.toArray() || [];
        const iframeEl = iframeArray.find(el => el.nativeElement.getAttribute('data-app-id') === appId);

        if (!iframeEl) {
            console.warn(`[LAYOUT] No iframe found to refresh for ${appId}`);
            return;
        }

        console.log(`[LAYOUT] Refreshing iframe for ${appId} via cross-origin safe src reset`);
        const currentSrc = iframeEl.nativeElement.src;
        iframeEl.nativeElement.src = 'about:blank'; // Safe fallback URL
        setTimeout(() => {
            iframeEl.nativeElement.src = currentSrc;
        }, 50);
    }

    toggleSidebar() {
        this.isSidebarOpen.update(v => !v);
    }

    async logOut() {
        try {
            // 1. Fermer toutes les applications (backend & frontend tabs)
            await this.hubNavigation.closeAllApps();
            
            // 2. Déconnexion Supabase
            await this.supabase.signOut();
            
            // 3. Vidange radicale du cache
            localStorage.clear();
            sessionStorage.clear();
            
            // 4. Hard reload vers la page de login pour détruire l'instance mémoire Angular
            window.location.href = '/login';
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            // Fallback de sécurité
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login';
        }
    }
}
