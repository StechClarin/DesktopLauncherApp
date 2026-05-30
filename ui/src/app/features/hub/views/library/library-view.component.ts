import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../core/services/hub.service';
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
  searchQuery = signal<string>('');
  activeFilter = signal<'all' | 'ready' | 'updates' | 'downloads'>('all');

  // Computed signal for reactively filtered applications
  filteredApps = computed(() => {
    const apps = this.hubService.installedApps();
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.activeFilter();

    let result = apps;

    // 1. Filter by status
    if (filter === 'ready') {
      result = apps.filter(a => a.status === 'installed');
    } else if (filter === 'updates') {
      result = apps.filter(a => a.status === 'update_available' || a.isNewUpdate);
    } else if (filter === 'downloads') {
      result = apps.filter(a => 
        a.status === 'installing' || 
        a.status === 'downloading' || 
        a.status === 'initializing' || 
        this.hubService.downloadingAppId() === a.id
      );
    }

    // 2. Filter by search query
    if (query) {
      result = result.filter(a => 
        a.name.toLowerCase().includes(query) || 
        (a.description && a.description.toLowerCase().includes(query))
      );
    }

    return result;
  });

  // Computed counts for badges
  countAll = computed(() => this.hubService.installedApps().length);
  countReady = computed(() => this.hubService.installedApps().filter(a => a.status === 'installed').length);
  countUpdates = computed(() => this.hubService.installedApps().filter(a => a.status === 'update_available' || a.isNewUpdate).length);
  countDownloads = computed(() => this.hubService.installedApps().filter(a => 
    a.status === 'installing' || 
    a.status === 'downloading' || 
    a.status === 'initializing' || 
    this.hubService.downloadingAppId() === a.id
  ).length);

  setLibraryView(mode: 'grid' | 'list') {
    this.libraryViewMode.set(mode);
    localStorage.setItem('hub_library_view', mode);
  }

  setFilter(filter: 'all' | 'ready' | 'updates' | 'downloads') {
    this.activeFilter.set(filter);
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
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
