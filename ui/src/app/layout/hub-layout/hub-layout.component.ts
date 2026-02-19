import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../core/services/hub.service';
import { Window } from '@tauri-apps/api/window';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    selector: 'app-hub-layout',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './hub-layout.component.html',
    styleUrl: './hub-layout.component.scss' // Make sure styles.scss covers global
})
export class HubLayoutComponent {
    hubService = inject(HubService);
    sanitizer = inject(DomSanitizer);

    // Navigation State
    activeTab = signal<'home' | 'library' | 'store' | 'downloads' | 'settings'>('home');
    selectedApp = signal<any | null>(null); // For Detail View
    isSidebarOpen = signal<boolean>(true);

    // Helper for SVGs
    getSafeSvg(svgString: string): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(svgString);
    }

    // Window Controls
    async minimizeWindow() {
        try {
            const appWindow = new Window('main');
            await appWindow.minimize();
        } catch (e) {
            console.warn('Tauri minimize failed (not in Tauri?)', e);
        }
    }

    async maximizeWindow() {
        try {
            const appWindow = new Window('main');
            await appWindow.toggleMaximize();
        } catch (e) {
            console.warn('Tauri maximize failed', e);
        }
    }

    async closeWindow() {
        try {
            const appWindow = new Window('main');
            await appWindow.close();
        } catch (e) {
            console.warn('Tauri close failed', e);
        }
    }

    toggleSidebar() {
        this.isSidebarOpen.update(v => !v);
    }

    closeSidebar() {
        this.isSidebarOpen.set(false);
    }

    setActiveTab(tab: 'home' | 'library' | 'store' | 'downloads' | 'settings') {
        this.activeTab.set(tab);
        this.selectedApp.set(null); // Clear selection when changing tabs
        if (window.innerWidth < 768) {
            this.closeSidebar();
        }
    }

    openAppDetails(app: any) {
        this.selectedApp.set(app);
    }

    installApp(appId: string) {
        this.hubService.installApp(appId);
    }
}
