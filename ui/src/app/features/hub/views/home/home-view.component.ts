import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../core/services/hub.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HomeHeroComponent } from './components/home-hero/home-hero.component';
import { SectionHeaderComponent } from '../../components/section-header/section-header.component';
import { AppCardComponent } from '../../components/app-card/app-card.component';
import { BundleCardComponent } from '../../components/bundle-card/bundle-card.component';
import { ModuleCardComponent } from '../../components/module-card/module-card.component';

export interface NewsItem {
  id: string;
  title: string;
  category: string;
  tagClass: string;
  date: string;
  summary: string;
  image: string;
}

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

  // Quick Resume widget: single most recently used app
  lastActiveApp = computed(() => this.hubService.recentApps()[0] || null);

  // Marketing news and changelogs feed
  newsItems = computed<NewsItem[]>(() => {
    const apps = this.hubService.allApps();
    const list: NewsItem[] = [];

    // 1. Updates news
    const updates = apps.filter(a => a.status === 'update_available' || a.isNewUpdate);
    for (const app of updates) {
      list.push({
        id: `update-${app.id}`,
        title: `Mise à jour majeure de ${app.name} v${app.version}`,
        category: 'MISE À JOUR',
        tagClass: 'text-blue-400 bg-blue-500/10 border border-blue-500/20',
        date: 'Aujourd\'hui',
        summary: `Une nouvelle version stable est disponible pour ${app.name}. Mettez à jour votre application pour bénéficier des dernières améliorations et optimisations de performance.`,
        image: app.banner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=70&w=600&auto=format&fit=crop'
      });
    }

    // 2. Promotions / Deals news
    const promos = apps.filter(a => a.hasDiscount);
    for (const app of promos) {
      list.push({
        id: `promo-${app.id}`,
        title: `Offre Spéciale : ${app.name} est à ${app.discount} !`,
        category: 'PROMOTION',
        tagClass: 'text-yellow-500 bg-yellow-500/10 border border-yellow-500/20',
        date: 'En cours',
        summary: `Économisez dès aujourd'hui sur l'abonnement ou la licence complète de ${app.name}. Déverrouillez de nouvelles fonctionnalités pour seulement ${app.price} !`,
        image: app.banner || 'https://images.unsplash.com/photo-1576867757603-05b134ebc379?q=70&w=600&auto=format&fit=crop'
      });
    }

    // 3. New Releases news
    const newApps = this.hubService.storeNewReleases().filter(a => !a.hasDiscount);
    for (const app of newApps) {
      list.push({
        id: `new-${app.id}`,
        title: `Lancement de ${app.name} dans la boutique`,
        category: 'NOUVEAU',
        tagClass: 'text-purple-400 bg-purple-500/10 border border-purple-500/20',
        date: 'Récemment',
        summary: app.description || `Découvrez ${app.name}, la nouvelle application disponible sur notre plateforme. Intégrez-la dès aujourd'hui dans vos outils de productivité.`,
        image: app.banner || 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=70&w=600&auto=format&fit=crop'
      });
    }

    // Fallback if empty (e.g. no news generated, display default generic platform news)
    if (list.length === 0) {
      list.push({
        id: 'news-general-1',
        title: 'Mise à jour majeure du Hub Ethernanos',
        category: 'COMMUNAUTÉ',
        tagClass: 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20',
        date: 'Récemment',
        summary: 'La version 1.2.0 du lanceur Ethernanos introduit une interface optimisée, un nouveau store et des transitions matérielles accélérées.',
        image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=70&w=600&auto=format&fit=crop'
      });
    }

    return list;
  });

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

  launchApp(event: Event, app: any) {
    event.stopPropagation();
    this.hubService.launchApp(app);
  }
}
