import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioContext: AudioContext | null = null;
  private ambientAudio: HTMLAudioElement | null = null;
  
  // Settings Signals
  keyboardSoundEnabled = signal<boolean>(localStorage.getItem('audio-keyboard-enabled') !== 'false');
  ambientSoundEnabled = signal<boolean>(localStorage.getItem('audio-ambient-enabled') === 'true');
  globalVolume = signal<number>(Number(localStorage.getItem('audio-global-volume') || '50'));
  selectedAmbientType = signal<'calm' | 'motivating' | 'jazz' | 'cyberpunk' | 'rain'>(localStorage.getItem('audio-ambient-type') as any || 'calm');
  selectedKeyboardType = signal<'mechanical' | 'modern' | 'soft'>(localStorage.getItem('audio-keyboard-type') as any || 'mechanical');

  private ambientSources = {
    calm: 'assets/audio/ambient/zen.mp3',
    motivating: 'assets/audio/ambient/focus.mp3',
    jazz: 'assets/audio/ambient/jazz.mp3',
    cyberpunk: 'assets/audio/ambient/cyber.mp3',
    rain: 'assets/audio/ambient/rain.mp3'
  };

  constructor() {
    // Persist settings
    effect(() => {
      localStorage.setItem('audio-keyboard-enabled', String(this.keyboardSoundEnabled()));
      localStorage.setItem('audio-ambient-enabled', String(this.ambientSoundEnabled()));
      localStorage.setItem('audio-global-volume', String(this.globalVolume()));
      localStorage.setItem('audio-ambient-type', this.selectedAmbientType());
      localStorage.setItem('audio-keyboard-type', this.selectedKeyboardType());
      
      this.updateAmbientState();
    });

    // Handle window focus/blur for "Opera GX" style focus-only audio
    window.addEventListener('focus', () => this.resumeAudio());
    window.addEventListener('blur', () => this.pauseAudio());

    // Global Unlock on first interaction
    const unlock = () => {
      this.initAudioContext();
      if (this.ambientSoundEnabled() && this.ambientAudio?.paused) {
        this.ambientAudio.play().catch(() => {});
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
  }

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  async playKeyboardClick() {
    if (!this.keyboardSoundEnabled()) return;
    
    this.initAudioContext();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const masterGain = this.audioContext.createGain();
    masterGain.gain.setValueAtTime((this.globalVolume() / 100) * 0.15, now);
    masterGain.connect(this.audioContext.destination);

    const type = this.selectedKeyboardType();
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    if (type === 'mechanical') {
      // Classic "Tac" (Triangle)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
      osc.start(now);
      osc.stop(now + 0.03);
    } else if (type === 'modern') {
      // Sharp "Click" (Square)
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.01);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.015);
      osc.start(now);
      osc.stop(now + 0.015);
    } else {
      // Soft "Thump" (Sine)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }

    osc.connect(gain);
    gain.connect(masterGain);
  }

  private updateAmbientState() {
    if (this.ambientSoundEnabled()) {
      this.playAmbient();
    } else {
      this.stopAmbient();
    }
  }

  private playAmbient() {
    const currentUrl = this.ambientSources[this.selectedAmbientType()];
    
    if (!this.ambientAudio) {
      this.ambientAudio = new Audio();
      this.ambientAudio.loop = true;
      this.ambientAudio.crossOrigin = "anonymous";
    }
    
    // Update source only if changed
    if (this.ambientAudio.src !== currentUrl) {
      this.ambientAudio.pause();
      this.ambientAudio.src = currentUrl;
      this.ambientAudio.load();
    }
    
    this.ambientAudio.volume = (this.globalVolume() / 100) * 0.15;
    
    if (document.hasFocus() && this.ambientSoundEnabled()) {
      this.ambientAudio.play().catch(e => {
        console.warn('Autoplay blocked. Sound will start on next interaction.', e);
        // Retry on first click
        window.addEventListener('click', () => {
          if (this.ambientSoundEnabled()) this.ambientAudio?.play();
        }, { once: true });
      });
    }
  }

  private stopAmbient() {
    if (this.ambientAudio) {
      this.ambientAudio.pause();
    }
  }

  private resumeAudio() {
    if (this.ambientSoundEnabled() && this.ambientAudio) {
      this.ambientAudio.play().catch(() => {});
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private pauseAudio() {
    if (this.ambientAudio) {
      this.ambientAudio.pause();
    }
  }
}
