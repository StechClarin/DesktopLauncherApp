import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-section-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-between mb-8">
        <div class="flex flex-col">
            <h2 [class]="'text-xl md:text-2xl font-black text-white px-4 border-l-4 uppercase tracking-wider ' + borderClass">
                {{ title }}
            </h2>
            @if (subtitle) {
                <span class="text-[10px] font-bold text-slate-500 tracking-[0.2em] mt-2 ml-4">{{ subtitle }}</span>
            }
        </div>
        @if (showAction) {
            <button (click)="actionClicked.emit()" 
                class="group flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-white transition-all tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/5 hover:border-white/10 uppercase">
                <span>{{ actionLabel }}</span>
                <span class="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </button>
        }
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class SectionHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() borderClass: string = 'border-blue-600';
  @Input() showAction: boolean = false;
  @Input() actionLabel: string = 'VOIR TOUT';
  
  @Output() actionClicked = new EventEmitter<void>();
}
