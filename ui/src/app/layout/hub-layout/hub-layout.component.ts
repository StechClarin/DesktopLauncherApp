import { Component, computed, inject, signal, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HubService } from '../../core/services/hub.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
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
        AppDetailViewComponent
    ],
    templateUrl: './hub-layout.component.html',
    styleUrl: './hub-layout.component.scss'
})
export class HubLayoutComponent {
    hubService = inject(HubService);
    supabase = inject(SupabaseService);
    sanitizer = inject(DomSanitizer);
    router = inject(Router);

    user = toSignal(this.supabase.currentUser$);
    isSidebarOpen = signal<boolean>(true);

    toggleSidebar() {
        this.isSidebarOpen.update(v => !v);
    }

    // Helper for App Iframes
    getSafeUrl(url: string) {
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }

    async logOut() {
        await this.supabase.signOut();
        this.router.navigate(['/login']);
    }
}
