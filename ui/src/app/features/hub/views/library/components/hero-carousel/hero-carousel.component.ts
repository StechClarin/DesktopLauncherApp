import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../../../core/services/hub.service';

@Component({
  selector: 'app-hero-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero-carousel.component.html',
  styleUrl: './hero-carousel.component.scss'
})
export class HeroCarouselComponent implements OnInit, OnDestroy {
  hubService = inject(HubService);
  currentSlide = signal(0);
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
      this.nextSlide();
    }, 5000);
  }

  stopAutoPlay() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  setSlide(index: number) {
    this.currentSlide.set(index);
    this.startAutoPlay();
  }

  nextSlide() {
    const total = this.hubService.libraryCarousel().length;
    if (total > 0) {
      this.currentSlide.update(c => (c + 1) % total);
    }
  }

  onLearnMore(item: any) {
    if (item.type === 'app') {
      const app = this.hubService.allApps().find(a => a.id === item.id);
      if (app) {
        this.hubService.selectedApp.set(app);
      }
    } else if (item.type === 'bundle') {
      this.hubService.setActiveTab('store');
    }
  }
}
