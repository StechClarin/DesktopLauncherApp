import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-module-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div (click)="clicked.emit()"
        class="group relative overflow-hidden rounded-xl bg-slate-800/50 border border-white/5 hover:border-indigo-500/50 p-3 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 h-full">
        
        <!-- New Badge (Original design) -->
        <div class="absolute top-0 right-0 p-1.5 flex flex-col items-end gap-1">
            <div class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
            @if (module.hasDiscount) {
                <div class="bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded skew-x-[-10deg] shadow-lg shadow-indigo-500/20 animate-in zoom-in duration-300">
                    {{ module.discount }}
                </div>
            }
        </div>

        <div class="flex flex-col gap-3">
            <!-- Header (Icon + App Name) -->
            <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform"
                    [innerHTML]="getSafeSvg(module.icon)"></div>
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[100px]">
                    {{ module.appName || appName }}
                </span>
            </div>

            <!-- Content (Module Name + Description) -->
            <div>
                <h4 class="font-bold text-white text-sm leading-tight group-hover:text-indigo-400 transition-colors line-clamp-1">
                    {{ module.name }}
                </h4>
                <div class="flex items-center justify-between mt-1">
                    <p class="text-[9px] text-slate-500 font-medium italic">Premium module</p>
                    <div class="flex flex-col items-end">
                        @if (module.hasDiscount) {
                            <span class="text-[8px] text-slate-500 line-through leading-none">{{ module.oldPrice }}</span>
                            <span class="text-[11px] font-black text-indigo-400 leading-none">{{ module.price }}</span>
                        } @else {
                            <span class="text-[11px] font-bold text-slate-400 leading-none">{{ module.displayPrice }}</span>
                        }
                    </div>
                </div>
            </div>
        </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class ModuleCardComponent {
  @Input({ required: true }) module: any;
  @Input() appName: string = '';
  @Output() clicked = new EventEmitter<void>();
  
  private sanitizer = inject(DomSanitizer);

  getSafeSvg(svgString: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svgString);
  }
}
