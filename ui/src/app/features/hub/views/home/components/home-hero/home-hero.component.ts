import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../../../core/services/hub.service';

@Component({
  selector: 'app-home-hero',
  standalone: true,
  imports: [CommonModule],
  template: `
    @let featured = hubService.featuredApp();

    @if (hubService.isLoading()) {
        <section class="mb-10 relative h-[400px] rounded-2xl bg-slate-900 overflow-hidden animate-pulse border border-white/5">
            <div class="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-900"></div>
        </section>
    } @else if (featured) {
        <section class="mb-10 relative group">
            <div class="absolute -inset-1 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
            <div class="relative h-[400px] rounded-2xl bg-slate-900 overflow-hidden shadow-2xl">
                <!-- Background Image -->
                <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    [style.backgroundImage]="'url(' + (featured.banner || '') + ')'">
                    <div class="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent"></div>
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80"></div>
                </div>

                <!-- Content -->
                <div class="absolute inset-0 p-10 flex flex-col justify-center max-w-2xl">
                    <div class="flex items-center gap-3 mb-4">
                        <span class="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-500 text-white shadow-lg shadow-blue-500/50 animate-pulse uppercase tracking-widest">FEATURED</span>
                        <span class="text-slate-300 font-mono text-xs">v{{ featured.version }}</span>
                    </div>

                    <h1 class="text-5xl md:text-6xl font-black text-white mb-4 leading-tight drop-shadow-xl tracking-tight">
                        {{ featured.name }}
                    </h1>

                    <p class="text-lg text-slate-300 mb-8 leading-relaxed max-w-xl font-light">
                        {{ featured.description }}
                    </p>

                    <div class="flex items-center gap-4">
                        <button (click)="featuredClicked.emit(featured)"
                            class="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 group/btn">
                            <span>DÉCOUVRIR</span>
                            <svg xmlns="http://www.w3.org/2000/svg"
                                class="h-5 w-5 group-hover/btn:translate-x-1 transition-transform" fill="none"
                                viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                        <button (click)="$event.stopPropagation()"
                            class="px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 backdrop-blur-md transition-all">
                            + AJOUTER
                        </button>
                    </div>
                </div>
            </div>
        </section>
    }
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class HomeHeroComponent {
  hubService = inject(HubService);
  @Output() featuredClicked = new EventEmitter<any>();
}
