import { Injectable, signal, effect, Renderer2, RendererFactory2 } from '@angular/core';

export type HubTheme = 'onyx' | 'midnight' | 'cyberpunk' | 'snow';
export type AccentColor = 'purple' | 'blue' | 'emerald' | 'amber' | 'rose' | 'cyan';

@Injectable({
  providedIn: 'root'
})
export class AppearanceService {
  private renderer: Renderer2;
  
  // Settings Signals
  theme = signal<HubTheme>(localStorage.getItem('ui-theme') as HubTheme || 'onyx');
  accentColor = signal<AccentColor>(localStorage.getItem('ui-accent') as AccentColor || 'purple');
  glassIntensity = signal<number>(Number(localStorage.getItem('ui-glass-intensity') || '12'));
  animationsEnabled = signal<boolean>(localStorage.getItem('ui-animations') !== 'false');

  public accents: Record<AccentColor, string> = {
    purple: '#a855f7',
    blue: '#3b82f6',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#f43f5e',
    cyan: '#06b6d4'
  };

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);

    // Apply changes automatically via effects
    effect(() => {
      const currentTheme = this.theme();
      const currentAccent = this.accentColor();
      const intensity = this.glassIntensity();
      const anims = this.animationsEnabled();

      // Persist
      localStorage.setItem('ui-theme', currentTheme);
      localStorage.setItem('ui-accent', currentAccent);
      localStorage.setItem('ui-glass-intensity', String(intensity));
      localStorage.setItem('ui-animations', String(anims));

      // Apply to DOM
      this.applyTheme(currentTheme, currentAccent, intensity, anims);
    });
  }

  private applyTheme(theme: HubTheme, accent: AccentColor, intensity: number, anims: boolean) {
    const root = document.documentElement;
    const accentHex = this.accents[accent];

    // Update CSS Variables
    root.style.setProperty('--accent-primary', accentHex);
    root.style.setProperty('--accent-glow', `${accentHex}33`); // 20% opacity
    root.style.setProperty('--glass-blur', `${intensity}px`);

    // Apply Theme Classes
    this.renderer.removeClass(document.body, 'theme-onyx');
    this.renderer.removeClass(document.body, 'theme-midnight');
    this.renderer.removeClass(document.body, 'theme-cyberpunk');
    this.renderer.removeClass(document.body, 'theme-snow');
    this.renderer.addClass(document.body, `theme-${theme}`);

    if (theme === 'snow') {
        this.renderer.addClass(document.body, 'light-mode');
    } else {
        this.renderer.removeClass(document.body, 'light-mode');
    }

    if (!anims) {
        this.renderer.addClass(document.body, 'disable-animations');
    } else {
        this.renderer.removeClass(document.body, 'disable-animations');
    }
  }
}