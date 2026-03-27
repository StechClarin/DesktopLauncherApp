import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../core/services/hub.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HomeHeroComponent } from './components/home-hero/home-hero.component';
import { SectionHeaderComponent } from '../../components/section-header/section-header.component';
import { AppCardComponent } from '../../components/app-card/app-card.component';
import { BundleCardComponent } from '../../components/bundle-card/bundle-card.component';
import { ModuleCardComponent } from '../../components/module-card/module-card.component';

@Component({
  selector: 'app-home-view',
  standalone: true,
  imports: [
    CommonModule,
    HomeHeroComponent,
    SectionHeaderComponent,
    AppCardComponent,
    BundleCardComponent,
    ModuleCardComponent
  ],
  templateUrl: './home-view.component.html',
  styleUrl: './home-view.component.scss'
})
export class HomeViewComponent {
  hubService = inject(HubService);
  private sanitizer = inject(DomSanitizer);

  getSafeSvg(svgString?: string): SafeHtml {
    if (!svgString) return '';
    return this.sanitizer.bypassSecurityTrustHtml(svgString);
  }

  openAppDetails(app: any) {
    this.hubService.selectedApp.set(app);
  }

  setActiveTab(tab: string) {
    this.hubService.setActiveTab(tab as any);
  }

  navigateToModuleApp(module: any) {
    this.hubService.navigateToModuleApp(module);
  }
}
