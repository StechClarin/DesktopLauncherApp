import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../core/services/hub.service';
import { getCurrentWindow } from '@tauri-apps/api/window';

@Component({
  selector: 'app-hub-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hub-header.component.html',
  styleUrl: './hub-header.component.scss'
})
export class HubHeaderComponent {
  hubService = inject(HubService);

  // Inputs
  user = input<any>();
  isSidebarOpen = input<boolean>(true);

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
      await appWindow.toggleMaximize();
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
}
