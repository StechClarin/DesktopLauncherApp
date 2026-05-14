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

  private readySubject = new BehaviorSubject<{appId: string} | null>(null);
  public ready$ = this.readySubject.asObservable();

  private outputSubject = new BehaviorSubject<{appId: string, text: string} | null>(null);
  public output$ = this.outputSubject.asObservable();

  private activeAppId: string | null = null;

  constructor() {
    this.initListeners();
  }

  private async initListeners() {
    if (!(window as any).__TAURI_INTERNALS__) {
      console.warn("[Terminal] Environnement non-Tauri détecté, les logs ne seront pas disponibles.");
      return;
    }
    // 1. Listen for raw logs
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
      
      if (appLogs.length > 500) appLogs.shift();

      if (log.app_id === this.activeAppId) {
        this.logsSubject.next([...appLogs]);
      }

      // Émission immédiate pour la surveillance d'activité
      this.outputSubject.next({ appId: log.app_id, text: log.message });
    });

    // 2. Listen for the reactive READY signal (Industrial v2.0)
    await listen<string>('app-ready', (event) => {
      console.log(`[Terminal] Signal READY reçu pour l'application: ${event.payload}`);
      this.readySubject.next({ appId: event.payload });
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

  resetReady() {
    this.readySubject.next(null);
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
