import { Component, Output, EventEmitter, inject, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../../../core/services/hub.service';

export interface Slide {
  title: string;
  tag: string;
  tagClass: string;
  description: string;
  image: string;
  actionText: string;
  appId?: string;
}

@Component({
  selector: 'app-home-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-hero.component.html',
  styleUrl: './home-hero.component.scss'
})
export class HomeHeroComponent implements OnInit, OnDestroy {
  hubService = inject(HubService);
  @Output() featuredClicked = new EventEmitter<any>();

  // Dynamic slides computed signal
  slides = computed<Slide[]>(() => {
    const apps = this.hubService.allApps();
    if (apps.length === 0) return [];

    const list: Slide[] = [];

    // Slide 1: Featured App (Spotlight)
    const featured = this.hubService.featuredApp();
    if (featured) {
      list.push({
        title: `${featured.name} v${featured.version}`,
        tag: 'À LA UNE',
        tagClass: 'bg-blue-600 text-white shadow-lg shadow-blue-500/30',
        description: featured.description || "Découvrez la puissance de l'écosystème EtherNanos.",
        image: featured.banner || featured.banner_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=70&w=1200&auto=format&fit=crop',
        actionText: 'DÉCOUVRIR',
        appId: featured.id
      });
    }

    // Slide 2: Active Deal / Promotion (or popular app if none)
    const dealApp = apps.find(a => a.hasDiscount);
    if (dealApp) {
      list.push({
        title: `${dealApp.name} - EN PROMOTION`,
        tag: dealApp.discount || 'PROMOTION',
        tagClass: 'bg-yellow-500 text-black font-black',
        description: `Profitez d'un tarif exceptionnel sur ${dealApp.name} : ${dealApp.price} au lieu de ${dealApp.oldPrice} !`,
        image: dealApp.banner || dealApp.banner_url || 'https://images.unsplash.com/photo-1576867757603-05b134ebc379?q=70&w=1200&auto=format&fit=crop',
        actionText: 'VOIR L\'OFFRE',
        appId: dealApp.id
      });
    } else {
      const popular = this.hubService.popularApps()[0];
      if (popular) {
        list.push({
          title: `${popular.name} - POPULAIRE`,
          tag: 'TENDANCE',
          tagClass: 'bg-green-600 text-white shadow-lg shadow-green-500/30',
          description: popular.description || "Découvrez l'une des applications les plus utilisées de notre catalogue.",
          image: popular.banner || popular.banner_url || 'https://images.unsplash.com/photo-1576867757603-05b134ebc379?q=70&w=1200&auto=format&fit=crop',
          actionText: 'EXPLORER',
          appId: popular.id
        });
      }
    }

    // Slide 3: New Release
    const newReleases = this.hubService.storeNewReleases();
    const newest = newReleases.find(a => a.id !== featured?.id && (!dealApp || a.id !== dealApp.id)) || newReleases[0];
    if (newest) {
      list.push({
        title: `${newest.name} - DISPONIBLE`,
        tag: 'NOUVEAU',
        tagClass: 'bg-purple-600 text-white shadow-lg shadow-purple-500/30',
        description: newest.description || "Nouvelle application disponible sur la boutique.",
        image: newest.banner || newest.banner_url || 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=70&w=1200&auto=format&fit=crop',
        actionText: 'DÉCOUVRIR',
        appId: newest.id
      });
    }

    return list;
  });

  activeSlideIndex = 0;
  private intervalId: any;

  ngOnInit() {
    this.startAutoPlay();
  }

  ngOnDestroy() {
    this.stopAutoPlay();
  }

  startAutoPlay() {
    this.stopAutoPlay();
    this.intervalId = setInterval(() => {
      this.nextSlideAuto();
    }, 6000);
  }

  stopAutoPlay() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  prevSlide() {
    this.stopAutoPlay();
    const len = this.slides().length;
    if (len > 0) {
      this.activeSlideIndex = (this.activeSlideIndex === 0) ? (len - 1) : (this.activeSlideIndex - 1);
    }
    this.startAutoPlay();
  }

  nextSlide() {
    this.stopAutoPlay();
    const len = this.slides().length;
    if (len > 0) {
      this.activeSlideIndex = (this.activeSlideIndex === len - 1) ? 0 : (this.activeSlideIndex + 1);
    }
    this.startAutoPlay();
  }

  private nextSlideAuto() {
    const len = this.slides().length;
    if (len > 0) {
      this.activeSlideIndex = (this.activeSlideIndex === len - 1) ? 0 : (this.activeSlideIndex + 1);
    }
  }

  goToSlide(index: number) {
    this.stopAutoPlay();
    this.activeSlideIndex = index;
    this.startAutoPlay();
  }

  onActionClick(slide: Slide) {
    if (slide.appId) {
      const app = this.hubService.allApps().find(a => a.id === slide.appId);
      if (app) {
        this.featuredClicked.emit(app);
      }
    }
  }
}
