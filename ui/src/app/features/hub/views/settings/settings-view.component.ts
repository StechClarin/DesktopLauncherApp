import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../core/services/hub.service';
import { AudioService } from '../../../../core/services/audio.service';
import { FormsModule } from '@angular/forms';

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
  
  // Navigation
  activeSection = signal<'db' | 'update' | 'about' | 'experience'>('db');

  dbHost = this.hubService.dbHost;
  dbPort = this.hubService.dbPort;
  dbUser = this.hubService.dbUser;
  dbPass = this.hubService.dbPass;

  testDbConnection() {
    this.hubService.testDbConnection();
  }

  saveDbConfig() {
    this.hubService.saveDbConfig();
  }

  setSection(section: 'db' | 'update' | 'about' | 'experience') {
    this.activeSection.set(section);
  }
}
