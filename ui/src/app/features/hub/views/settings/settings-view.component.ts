import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HubService } from '../../../../core/services/hub.service';
import { AudioService } from '../../../../core/services/audio.service';
import { AppearanceService, AccentColor } from '../../../../core/services/appearance.service';
import { DbConfig } from '../../../../core/models/hub.models';

@Component({
  selector: 'app-settings-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-view.component.html',
  styleUrl: './settings-view.component.scss'
})
export class SettingsViewComponent {
  hubService = inject(HubService);
  audioService = inject(AudioService);
  appearanceService = inject(AppearanceService);
  
  // Typed colors for the template
  accentColors: AccentColor[] = ['purple', 'blue', 'emerald', 'amber', 'rose', 'cyan'];

  // Navigation
  activeSection = signal<'update' | 'about' | 'experience' | 'appearance'>('appearance');

  setSection(section: 'update' | 'about' | 'experience' | 'appearance') {
    this.activeSection.set(section);
  }
}
