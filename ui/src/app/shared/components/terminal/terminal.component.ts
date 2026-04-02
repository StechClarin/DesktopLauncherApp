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

  constructor(private terminalService: TerminalService) {}

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

  clearLogs(event: MouseEvent) {
    event.stopPropagation();
    this.terminalService.clear();
  }

  close(event: MouseEvent) {
    event.stopPropagation();
    this.terminalService.close();
  }
}
