import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private _currentUser = new BehaviorSubject<User | null | undefined>(undefined);

  constructor() {
    // Use environment variables with fallbacks
    const meta = import.meta as any;
    const metaEnv = meta.env || {};
    const supabaseUrl = metaEnv.VITE_SUPABASE_URL || 'https://tskaatmquckvuvamymcx.supabase.co';
    const supabaseKey = metaEnv.VITE_SUPABASE_ANON_KEY || 'sb_publishable_7EySw7dL-ZndQLvZ0MNoeQ_Ee36OzxT';
    
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: {
          getItem: (key: string) => window.localStorage.getItem(key),
          setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
          removeItem: (key: string) => window.localStorage.removeItem(key),
          // No-op lock implementation to bypass Navigator LockManager issues in Tauri
          lock: async (name: string, callback: () => Promise<any>) => await callback(),
        } as any,
        storageKey: 'ethernanos-launcher-auth',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce'
      }
    });
    
    // Initial check
    this.supabase.auth.getUser().then(({ data: { user } }) => {
      this._currentUser.next(user);
    });

    // Listen to changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      this._currentUser.next(session?.user ?? null);
    });
  }

  get currentUser$(): Observable<User | null | undefined> {
    return this._currentUser.asObservable();
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  async signIn(email: string, pass: string) {
    return await this.supabase.auth.signInWithPassword({
      email,
      password: pass
    });
  }

  async signOut() {
    await this.supabase.auth.signOut();
  }

  // Helper for fetching tenant info
  async getTenantByOwner(userId: string) {
    return await this.supabase
      .from('tenants')
      .select('*')
      .eq('owner_id', userId)
      .single();
  }
}
