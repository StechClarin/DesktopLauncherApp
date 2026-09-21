import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HubService } from '../../../../core/services/hub.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-installation-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './installation-wizard.component.html',
  styleUrl: './installation-wizard.component.scss',
  animations: [
    trigger('stepAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(-20px)' }))
      ])
    ])
  ]
})
export class InstallationWizardComponent {
  hubService = inject(HubService);
  
  app = this.hubService.state.showInstallationWizard;
  currentStep = signal<number>(1);
  
  // Data models
  usageMode = signal<'solo' | 'structure'>('solo');
  role = signal<'server' | 'client'>('server');
  
  // DB Config for Server or Solo (Solo uses default/sqlite usually, but we allow config)
  dbConfig = {
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    pass: ''
  };
  
  serverIp = signal<string>('');
  isTestingConnection = signal<boolean>(false);
  connectionStatus = signal<'success' | 'error' | null>(null);

  constructor() {
    // Pré-remplit le wizard avec la configuration déjà sauvegardée sur disque
    // (cas d'une mise à jour) pour conserver le mode choisi et ses impacts.
    effect(async () => {
      const app = this.app();
      if (app) {
        await this.loadSavedConfig(app.id);
      }
    });
  }

  private async loadSavedConfig(appId: string) {
    if (!(window as any).__TAURI_INTERNALS__) return;
    try {
      const saved = await this.hubService.config.loadDbConfig(appId);
      if (saved) {
        this.usageMode.set((saved.mode as 'solo' | 'structure') || 'solo');
        this.role.set((saved.role as 'server' | 'client') || 'server');
        this.dbConfig.host = saved.host || '127.0.0.1';
        this.dbConfig.port = saved.port || 5432;
        this.dbConfig.user = saved.user || 'postgres';
        this.dbConfig.pass = saved.pass || '';
        this.serverIp.set(saved.server_ip || '');
      }
    } catch (e) {
      console.warn('Impossible de charger la configuration sauvegardée', e);
    }
  }

  isStepDisabled(step: number): boolean {
    return this.usageMode() === 'solo' && (step === 2 || step === 3);
  }

  nextStep() {
    if (this.currentStep() === 1 && this.usageMode() === 'solo') {
      this.currentStep.set(4); // Skip to confirm for solo
    } else {
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep() {
    if (this.currentStep() === 4 && this.usageMode() === 'solo') {
      this.currentStep.set(1);
    } else {
      this.currentStep.update(s => s - 1);
    }
  }

  close() {
    this.hubService.state.showInstallationWizard.set(null);
    this.currentStep.set(1);
  }

  async testConnection() {
    this.isTestingConnection.set(true);
    this.connectionStatus.set(null);
    
    try {
      const configToTest = { ...this.dbConfig };
      
      // Si on est client, on teste la connexion vers l'IP du serveur
      if (this.role() === 'client') {
        configToTest.host = this.serverIp();
      }

      await this.hubService.testDbConnection(configToTest);
      this.connectionStatus.set('success');
    } catch (e) {
      this.connectionStatus.set('error');
    } finally {
      this.isTestingConnection.set(false);
    }
  }

  async confirmInstallation() {
    const app = this.app();
    if (!app) return;

    // Save deployment mode and role
    localStorage.setItem('hub-deployment-mode', this.usageMode());
    localStorage.setItem('hub-deployment-role', this.role());
    this.hubService.state.deploymentMode.set(this.usageMode());
    this.hubService.state.deploymentRole.set(this.role());

    // Save configuration if server or solo with custom DB
      await this.hubService.saveDbConfig(app.id, {
        ...this.dbConfig,
        mode: this.usageMode(),
        role: this.role(),
        server_ip: this.serverIp()
      } as any);

    // Trigger real installation
    this.hubService.installApp(app.id);
    this.close();
  }
}
