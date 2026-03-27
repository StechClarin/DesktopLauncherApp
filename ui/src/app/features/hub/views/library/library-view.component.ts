import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../core/services/hub.service';
import { HeroCarouselComponent } from './components/hero-carousel/hero-carousel.component';
import { LibraryStatsComponent } from './components/library-stats/library-stats.component';
import { AppCardComponent } from '../../components/app-card/app-card.component';
import { SectionHeaderComponent } from '../../components/section-header/section-header.component';
import { ModuleCardComponent } from '../../components/module-card/module-card.component';
import { MostUsedAppBannerComponent } from './components/most-used-app-banner/most-used-app-banner.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-library-view',
  standalone: true,
  imports: [
    CommonModule, 
    HeroCarouselComponent, 
    LibraryStatsComponent, 
    AppCardComponent,
    SectionHeaderComponent,
    ModuleCardComponent,
    MostUsedAppBannerComponent
  ],
  templateUrl: './library-view.component.html',
  styleUrl: './library-view.component.scss'
})
export class LibraryViewComponent {
  hubService = inject(HubService);
  private sanitizer = inject(DomSanitizer);

  libraryViewMode = signal<'grid' | 'list'>('grid');

  setLibraryView(mode: 'grid' | 'list') {
    this.libraryViewMode.set(mode);
    localStorage.setItem('hub_library_view', mode);
  }

  constructor() {
    const saved = localStorage.getItem('hub_library_view') as 'grid' | 'list';
    if (saved) this.libraryViewMode.set(saved);
  }

  getSafeSvg(svgString?: string): SafeHtml {
    if (!svgString) return '';
    return this.sanitizer.bypassSecurityTrustHtml(svgString);
  }

  openAppDetails(app: any) {
    this.hubService.selectedApp.set(app);
  }
}
