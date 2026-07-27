import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SyncLoggerService } from '../../../../core/services/hub/sync-logger.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-sync-debug-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sync-debug-drawer.component.html',
  styleUrl: './sync-debug-drawer.component.scss'
})
export class SyncDebugDrawerComponent {
  logger = inject(SyncLoggerService);
  private toast = inject(ToastService);

  expandedLogs = new Set<string>();
  expandedSent = new Set<string>();
  expandedReceived = new Set<string>();

  toggleLog(id: string) {
    if (this.expandedLogs.has(id)) {
      this.expandedLogs.delete(id);
    } else {
      this.expandedLogs.add(id);
    }
  }

  isExpanded(id: string): boolean {
    return this.expandedLogs.has(id);
  }

  toggleSent(id: string) {
    if (this.expandedSent.has(id)) {
      this.expandedSent.delete(id);
    } else {
      this.expandedSent.add(id);
    }
  }

  isSentExpanded(id: string): boolean {
    return this.expandedSent.has(id);
  }

  toggleReceived(id: string) {
    if (this.expandedReceived.has(id)) {
      this.expandedReceived.delete(id);
    } else {
      this.expandedReceived.add(id);
    }
  }

  isReceivedExpanded(id: string): boolean {
    return this.expandedReceived.has(id);
  }

  deleteLog(id: string, event: MouseEvent) {
    event.stopPropagation();
    this.logger.deleteLog(id);
    this.expandedLogs.delete(id);
    this.expandedSent.delete(id);
    this.expandedReceived.delete(id);
    this.toast.success('Log supprimé.');
  }

  clearLogs() {
    this.logger.clearLogs();
    this.expandedLogs.clear();
  }

  copyToClipboard(text: string, event: MouseEvent) {
    event.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => this.toast.success('Copié dans le presse-papiers !'),
      () => this.toast.error('Échec de la copie.')
    );
  }

  getJsonString(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }

  getLogReport(log: any): any {
    if (log.payload) {
      return log.payload;
    }
    
    // Generate a structured diagnostic report for messages without standard payload
    const category = this.detectLogCategory(log.message, log.type);
    return {
      "evenement": log.message,
      "statut": log.type,
      "categorie": category,
      "diagnostic": this.getDiagnosticMessage(log.message, log.type),
      "horodatage": new Date(log.timestamp).toISOString(),
      "application_id": log.appId || "N/A"
    };
  }

  private detectLogCategory(message: string, type: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('sync') || msg.includes('pull') || msg.includes('push')) return 'Synchronisation';
    if (msg.includes('lancement') || msg.includes('démarrage') || msg.includes('ready') || msg.includes('port')) return 'Cycle de vie de l\'application';
    if (msg.includes('erreur') || msg.includes('échoué') || type === 'ERROR') return 'Erreurs & Diagnostics';
    return 'Information Système';
  }

  private getDiagnosticMessage(message: string, type: string): string {
    if (type === 'ERROR') return 'Veuillez inspecter les détails de l\'erreur ci-dessus.';
    const msg = message.toLowerCase();
    if (msg.includes('aucun fichier à télécharger') || msg.includes('aucun fichier à pousser')) {
      return 'Tous les fichiers locaux sont synchronisés et à jour avec le serveur VPS.';
    }
    if (msg.includes('aucun delta local')) {
      return 'Aucun changement n\'a été détecté localement depuis la dernière synchronisation.';
    }
    if (msg.includes('injection locale réussie')) {
      return 'Les données récupérées du cloud ont été injectées avec succès dans la base de données locale.';
    }
    if (msg.includes('synchronisation profonde terminée avec succès')) {
      return 'La synchronisation bidirectionnelle (Pull & Push) a été effectuée sans aucune erreur.';
    }
    return 'Opération complétée.';
  }
}
