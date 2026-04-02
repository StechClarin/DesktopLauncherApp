import { Injectable } from '@angular/core';
import { listen } from '@tauri-apps/api/event';
import { BehaviorSubject } from 'rxjs';

export interface AppLog {
  app_id: string;
  stream: 'stdout' | 'stderr';
  message: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class TerminalService {
  private logs = new Map<string, AppLog[]>();
  private logsSubject = new BehaviorSubject<AppLog[]>([]);
  public logs$ = this.logsSubject.asObservable();

  private isOpenSubject = new BehaviorSubject<boolean>(false);
  public isOpen$ = this.isOpenSubject.asObservable();

  private activeAppId: string | null = null;

  constructor() {
    this.initListener();
  }

  private async initListener() {
    await listen<any>('app-log', (event) => {
      const payload = event.payload;
      const log: AppLog = {
        app_id: payload.app_id,
        stream: payload.stream,
        message: payload.message,
        timestamp: new Date()
      };

      if (!this.logs.has(log.app_id)) {
        this.logs.set(log.app_id, []);
      }

      const appLogs = this.logs.get(log.app_id)!;
      appLogs.push(log);
      
      // Keep only last 500 lines
      if (appLogs.length > 500) {
        appLogs.shift();
      }

      if (log.app_id === this.activeAppId) {
        this.logsSubject.next([...appLogs]);
      }
    });
  }

  setActiveApp(appId: string) {
    this.activeAppId = appId;
    const appLogs = this.logs.get(appId) || [];
    this.logsSubject.next([...appLogs]);
  }

  open() {
    this.isOpenSubject.next(true);
  }

  close() {
    this.isOpenSubject.next(false);
  }

  toggle() {
    this.isOpenSubject.next(!this.isOpenSubject.value);
  }

  clear(appId?: string) {
    if (appId) {
      this.logs.set(appId, []);
      if (appId === this.activeAppId) {
        this.logsSubject.next([]);
      }
    } else {
      this.logs.clear();
      this.logsSubject.next([]);
    }
  }
}
