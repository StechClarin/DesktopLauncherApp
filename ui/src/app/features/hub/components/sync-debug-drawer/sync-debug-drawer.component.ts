import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SyncLoggerService } from '../../../../core/services/hub/sync-logger.service';

@Component({
  selector: 'app-sync-debug-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sync-debug-drawer.component.html',
  styleUrl: './sync-debug-drawer.component.scss'
})
export class SyncDebugDrawerComponent {
  logger = inject(SyncLoggerService);

  expandedLogs = new Set<string>();

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

  clearLogs() {
    this.logger.clearLogs();
    this.expandedLogs.clear();
  }
}
