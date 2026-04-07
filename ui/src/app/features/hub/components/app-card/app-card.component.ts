import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../core/services/hub.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-card.component.html',
  styleUrl: './app-card.component.scss'
})
export class AppCardComponent {
  hubService = inject(HubService);
  private sanitizer = inject(DomSanitizer);

  app = input.required<any>();
  mode = input<'grid' | 'list'>('grid');

  getSafeSvg(svgString?: string): SafeHtml {
    if (!svgString) return '';
    return this.sanitizer.bypassSecurityTrustHtml(svgString);
  }

  launchApp(event: Event, app: any) {
    event.stopPropagation();
    this.hubService.launchApp(app);
  }

  installApp(event: Event, app: any) {
    event.stopPropagation();
    this.hubService.installApp(app.id);
  }
}
