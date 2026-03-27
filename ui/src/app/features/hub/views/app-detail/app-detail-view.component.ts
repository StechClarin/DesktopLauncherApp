import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../core/services/hub.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ModuleCardComponent } from '../../components/module-card/module-card.component';

@Component({
  selector: 'app-app-detail-view',
  standalone: true,
  imports: [CommonModule, ModuleCardComponent],
  templateUrl: './app-detail-view.component.html',
  styleUrl: './app-detail-view.component.scss'
})
export class AppDetailViewComponent {
  hubService = inject(HubService);
  private sanitizer = inject(DomSanitizer);

  app = this.hubService.selectedApp;

  close() {
    this.hubService.selectedApp.set(null);
  }

  getSafeSvg(svgString?: string): SafeHtml {
    if (!svgString) return '';
    return this.sanitizer.bypassSecurityTrustHtml(svgString);
  }

  launchApp(app: any) {
    this.hubService.launchApp(app);
  }

  installApp(app: any) {
    this.hubService.installApp(app);
  }

  uninstallApp(app: any) {
    this.hubService.uninstallApp(app);
  }

  isInstalled(appId: string): boolean {
    return this.hubService.installedApps().some(a => a.id === appId);
  }

  isInstalling(appId: string): boolean {
    return this.hubService.installingApps().some(a => a.id === appId);
  }

  pullSync() {
    this.hubService.pullSync();
  }

  pushSync(appId: string) {
    this.hubService.pushSync(appId);
  }
}
