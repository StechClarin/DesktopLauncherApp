import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../../../core/services/hub.service';

@Component({
  selector: 'app-most-used-app-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (hubService.mostUsedApp(); as mostUsed) {
        <div (click)="hubService.selectedApp.set(mostUsed)"
            class="relative h-[280px] rounded-3xl overflow-hidden border border-white/10 group cursor-pointer shadow-2xl hover:shadow-blue-900/20 transition-all duration-500">
            <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                [style.backgroundImage]="'url(' + (mostUsed.banner || 'https://via.placeholder.com/1200x400') + ')'">
            </div>
            <div class="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent"></div>

            <div class="absolute inset-0 p-8 md:p-12 flex flex-col justify-center items-start">
                <div class="flex items-center gap-3 mb-4">
                    <span
                        class="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Plus utilisé
                    </span>
                    <span class="text-slate-300 font-mono text-sm">{{ mostUsed.usageTime }} ce mois-ci</span>
                </div>
                <h2
                    class="text-4xl md:text-5xl font-black text-white mb-2 group-hover:text-blue-400 transition-colors">
                    {{ mostUsed.name }}</h2>
                <p class="text-slate-300 max-w-lg text-lg mb-8 line-clamp-2">{{ mostUsed.description }}</p>

                <button (click)="launchApp($event, mostUsed)"
                    [class.bg-blue-600]="hubService.runningAppIds().has(mostUsed.id)"
                    [class.text-white]="hubService.runningAppIds().has(mostUsed.id)"
                    class="px-8 py-3 bg-white text-slate-950 font-bold rounded-xl hover:bg-blue-500 hover:text-white transition-all flex items-center gap-2">
                    <span class="material-symbols-outlined text-xl">
                        {{ hubService.runningAppIds().has(mostUsed.id) ? 'visibility' : 'play_circle' }}
                    </span>
                    {{ hubService.runningAppIds().has(mostUsed.id) ? 'En cours...' : 'Lancer maintenant' }}
                </button>
            </div>
        </div>
    }
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class MostUsedAppBannerComponent {
  hubService = inject(HubService);

  launchApp(event: Event, app: any) {
    event.stopPropagation();
    this.hubService.launchApp(app);
  }
}
