import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../core/services/hub.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-downloads-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './downloads-view.component.html',
  styleUrl: './downloads-view.component.scss'
})
export class DownloadsViewComponent {
  hubService = inject(HubService);
  private sanitizer = inject(DomSanitizer);

  getSafeSvg(svgString?: string): SafeHtml {
    if (!svgString) return '';
    return this.sanitizer.bypassSecurityTrustHtml(svgString);
  }

  launchAppFromHistory(appId: string, fallbackName: string) {
    const app = this.hubService.installedApps().find(a => a.id === appId) || { id: appId, name: fallbackName };
    this.hubService.launchApp(app);
  }
}
