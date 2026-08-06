import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { TerminalComponent } from './shared/components/terminal/terminal.component';
import { AudioService } from './core/services/audio.service';
import { HubService } from './core/services/hub.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, TerminalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'ui';
  hubService = inject(HubService);
  private audioService = inject(AudioService);

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // Only play if it's a standard key (avoid Meta, Ctrl, Alt alone)
    if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Enter' || event.key === 'Space') {
      this.audioService.playKeyboardClick();
    }
  }
}
