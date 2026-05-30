import { Component, inject, input, output, computed, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../core/services/hub.service';
import { AudioService } from '../../../../core/services/audio.service';
import { SyncLoggerService } from '../../../../core/services/hub/sync-logger.service';
import { getCurrentWindow } from '@tauri-apps/api/window';

@Component({
  selector: 'app-hub-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hub-header.component.html',
  styleUrl: './hub-header.component.scss'
})
export class HubHeaderComponent implements OnInit {
  hubService = inject(HubService);
  audioService = inject(AudioService);
  syncLogger = inject(SyncLoggerService);

  // Inputs
  user = input<any>();
  tenantName = input<string | null>();
  isSidebarOpen = input<boolean>(true);

  isMaximized = signal(false);

  async ngOnInit() {
    try {
      const appWindow = getCurrentWindow();
      this.isMaximized.set(await appWindow.isMaximized());
      
      // Update when window is resized/maximized
      await appWindow.onResized(async () => {
        this.isMaximized.set(await appWindow.isMaximized());
      });
    } catch (e) {
      console.warn('Failed to init window listeners', e);
    }
  }

  initials = computed(() => {
    const u = this.user();
    if (this.tenantName()) return this.tenantName()?.substring(0, 2).toUpperCase();
    if (u?.email) return u.email.substring(0, 2).toUpperCase();
    return '??';
  });

  // Outputs
  toggleSidebar = output<void>();
  logout = output<void>();

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  async logOut() {
    this.logout.emit();
  }

  // Window Controls (Encapsulated)
  async minimizeWindow() {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (e) {
      console.warn('Tauri minimize failed', e);
    }
  }

  async maximizeWindow() {
    try {
      const appWindow = getCurrentWindow();
      if (await appWindow.isMaximized() || await appWindow.isFullscreen()) {
        await appWindow.setFullscreen(false);
        await appWindow.unmaximize();
      } else {
        await appWindow.maximize();
      }
      this.isMaximized.set(await appWindow.isMaximized());
    } catch (e) {
      console.warn('Tauri maximize failed', e);
    }
  }

  async closeWindow() {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (e) {
      console.warn('Tauri close failed', e);
    }
  }

  async openDevTools() {
    try {
      const appWindow = getCurrentWindow();
      const win = appWindow as unknown as { openDevTools?: () => Promise<void> };
      if (typeof win.openDevTools === 'function') {
        await win.openDevTools();
      } else {
        console.warn('DevTools API unavailable on this platform.');
      }
    } catch (e) {
      console.warn('Failed to open DevTools', e);
    }
  }

  // CONTEXT MENU (v13.2)
  contextMenuVisible = signal(false);
  contextMenuX = signal(0);
  contextMenuY = signal(0);
  contextMenuTargetId = signal<string | null>(null);

  onTabContextMenu(event: MouseEvent, appId: string) {
    event.preventDefault(); // Bloquer le menu natif
    this.contextMenuX.set(event.clientX);
    this.contextMenuY.set(event.clientY);
    this.contextMenuTargetId.set(appId);
    this.contextMenuVisible.set(true);
  }

  refreshTab() {
    const id = this.contextMenuTargetId();
    if (id) {
      this.hubService.refreshTab(id);
    }
    this.closeContextMenu();
  }

  zoomIn(event: MouseEvent) {
    event.stopPropagation();
    const id = this.contextMenuTargetId();
    if (id) {
      this.hubService.setTabZoom(id, this.hubService.getTabZoom(id) + 0.1);
    }
  }

  zoomOut(event: MouseEvent) {
    event.stopPropagation();
    const id = this.contextMenuTargetId();
    if (id) {
      this.hubService.setTabZoom(id, this.hubService.getTabZoom(id) - 0.1);
    }
  }

  resetZoom(event: MouseEvent) {
    event.stopPropagation();
    const id = this.contextMenuTargetId();
    if (id) {
      this.hubService.setTabZoom(id, 1.0); // Reset to 100%
    }
  }

  getZoomPercent(): number {
    const id = this.contextMenuTargetId();
    if (!id) return 100;
    return Math.round(this.hubService.getTabZoom(id) * 100);
  }

  // Fermeture lors du clic ailleurs
  @HostListener('document:click')
  closeContextMenu() {
    this.contextMenuVisible.set(false);
    this.contextMenuTargetId.set(null);
  }
}
