import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bundle-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div (click)="clicked.emit()"
        class="group relative h-[220px] rounded-3xl overflow-hidden border border-white/10 hover:border-yellow-500/30 transition-all duration-500 cursor-pointer shadow-xl">
        <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
            [style.backgroundImage]="'url(' + (bundle.banner_url || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070') + ')'"></div>
        <div class="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent"></div>
        <div class="absolute inset-0 p-8 flex flex-col justify-center items-start">
            <div class="flex items-center gap-2 mb-2">
                <span class="bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded skew-x-[-10deg]">VUE PREMIÈRE</span>
                <span class="text-yellow-400 font-bold text-[10px]">{{ bundle.discount || '-30% RÉDUCTION' }}</span>
            </div>
            <h3 class="text-3xl font-black text-white mb-2 group-hover:text-yellow-400 transition-colors uppercase leading-none">{{ bundle.name }}</h3>
            <p class="text-slate-300 text-sm max-w-xs mb-4 line-clamp-2 h-10">{{ bundle.description }}</p>
            <div class="flex items-center gap-4">
                <div class="flex flex-col">
                    <span class="text-slate-500 line-through text-[10px] font-bold leading-none">{{ bundle.old_price }}€</span>
                    <span class="text-white font-black text-xl leading-none">{{ bundle.price }}€</span>
                </div>
                <button class="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs rounded-xl shadow-lg shadow-yellow-500/20 transition-all active:scale-95">DÉBLOQUER L'OFFRE</button>
            </div>
        </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class BundleCardComponent {
  @Input({ required: true }) bundle: any;
  @Output() clicked = new EventEmitter<void>();
}
