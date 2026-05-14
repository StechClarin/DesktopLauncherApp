import { Component, ElementRef, OnInit, ViewChild, AfterViewChecked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TerminalService, AppLog } from '../../../core/services/terminal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-terminal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="terminal-overlay" *ngIf="isOpen" [class.collapsed]="isCollapsed">
      <div class="terminal-header" (click)="toggleCollapse()">
        <div class="left">
          <span class="icon">🖥️</span>
          <span class="title">Console de Debugging - {{ activeAppId || 'Aucune app active' }}</span>
        </div>
        <div class="right">
          <button (click)="copyLogs($event)" class="action-btn" title="Copier le contenu">📋</button>
          <button (click)="clearLogs($event)" class="action-btn" title="Effacer la console">🗑️</button>
          <button (click)="close($event)" class="action-btn" title="Fermer la console">❌</button>
        </div>
      </div>
      
      <div class="terminal-body" #scrollContainer *ngIf="!isCollapsed">
        <div *ngFor="let log of logs" class="log-line" [class.error]="log.stream === 'stderr'">
          <span class="timestamp">[{{ log.timestamp | date:'HH:mm:ss' }}]</span>
          <span class="stream">[{{ log.stream.toUpperCase() }}]</span>
          <span class="message">{{ log.message }}</span>
        </div>
        <div *ngIf="logs.length === 0" class="empty-msg">
          Aucun log pour le moment...
        </div>
      </div>
    </div>
  `,
  styles: [`
    .terminal-overlay {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 300px;
      z-index: 9999;
      background: rgba(18, 18, 18, 0.95);
      border-top: 1px solid #444;
      display: flex;
      flex-direction: column;
      transition: height 0.3s ease;
      box-shadow: 0 -5px 15px rgba(0,0,0,0.5);
    }
    .terminal-overlay.collapsed {
      height: 40px;
    }
    .terminal-header {
      background: #2a2a2a;
      padding: 8px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
    }
    .terminal-header .title {
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      font-size: 13px;
      color: #ddd;
    }
    .terminal-header .left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .terminal-header .right {
      display: flex;
      gap: 12px;
    }
    .action-btn {
      background: none;
      border: none;
      color: #aaa;
      cursor: pointer;
      font-size: 14px;
      padding: 2px;
      border-radius: 4px;
      transition: all 0.2s;
    }
    .action-btn:hover {
      background: #444;
      color: white;
    }
    .terminal-body {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.5;
      user-select: text; /* Garantit que l'utilisateur peut sélectionner du texte */
    }
    .log-line {
      margin-bottom: 2px;
      word-break: break-all;
      white-space: pre-wrap;
    }
    .log-line.error {
      color: #ff5555;
    }
    .log-line .timestamp {
      color: #888;
      margin-right: 8px;
    }
    .log-line .stream {
      color: #00bcd4;
      margin-right: 8px;
      font-weight: bold;
    }
    .log-line .message {
      color: #eee;
    }
    .empty-msg {
      color: #666;
      font-style: italic;
      text-align: center;
      margin-top: 40px;
    }
    /* Scrollbar */
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #1a1a1a; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #444; }
  `]
})
export class TerminalComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  logs: AppLog[] = [];
  isOpen = false;
  isCollapsed = false;
  activeAppId: string | null = null;
  private sub = new Subscription();

  constructor(private terminalService: TerminalService) {
    this.captureConsoleLogs();
  }

  private captureConsoleLogs() {
    // Capture console.log, console.error, console.warn
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      originalLog(...args);
      this.addConsoleLog('LOG', args.join(' '));
    };

    console.error = (...args) => {
      originalError(...args);
      this.addConsoleLog('ERROR', args.join(' '));
    };

    console.warn = (...args) => {
      originalWarn(...args);
      this.addConsoleLog('WARN', args.join(' '));
    };
  }

  private addConsoleLog(level: string, message: string) {
    const log: AppLog = {
      app_id: this.activeAppId || 'console',
      stream: level === 'ERROR' ? 'stderr' : 'stdout',
      message: `[${level}] ${message}`,
      timestamp: new Date()
    };

    // Ajouter aux logs du terminal service
    if (!this.terminalService['logs'].has(log.app_id)) {
      this.terminalService['logs'].set(log.app_id, []);
    }

    const appLogs = this.terminalService['logs'].get(log.app_id)!;
    appLogs.push(log);

    if (appLogs.length > 500) appLogs.shift();

    // Mettre à jour l'affichage si c'est l'app active
    if (log.app_id === this.activeAppId || log.app_id === 'console') {
      this.logs = [...appLogs];
    }
  }

  ngOnInit() {
    this.sub.add(this.terminalService.logs$.subscribe(logs => {
      this.logs = logs;
    }));
    this.sub.add(this.terminalService.isOpen$.subscribe(isOpen => {
      this.isOpen = isOpen;
    }));
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  private scrollToBottom() {
    if (this.scrollContainer && !this.isCollapsed) {
      try {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      } catch (err) {}
    }
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
  }

  copyLogs(event: MouseEvent) {
    event.stopPropagation();
    if (this.logs.length === 0) return;
    
    const text = this.logs.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      return `[${time}] [${log.stream.toUpperCase()}] ${log.message}`;
    }).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      // Le texte est copié ! On pourrait ajouter une petite confirmation visuelle ici
    });
  }

  clearLogs(event: MouseEvent) {
    event.stopPropagation();
    this.terminalService.clear();
  }

  close(event: MouseEvent) {
    event.stopPropagation();
    this.terminalService.close();
  }
}
