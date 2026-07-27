import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private _currentUser: BehaviorSubject<User | null | undefined>;

  constructor() {
    // Use environment variables with fallbacks
    const meta = import.meta as any;
    const metaEnv = meta.env || {};
    const supabaseUrl = metaEnv.VITE_SUPABASE_URL || 'https://tskaatmquckvuvamymcx.supabase.co';
    const supabaseKey = metaEnv.VITE_SUPABASE_ANON_KEY || 'sb_publishable_7EySw7dL-ZndQLvZ0MNoeQ_Ee36OzxT';
    
    // Tente de récupérer de manière synchrone l'utilisateur du cache localStorage avant d'initialiser Supabase
    let initialUser: User | null = null;
    try {
      const savedAuth = window.localStorage.getItem('ethernanos-launcher-auth');
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed && parsed.user) {
          initialUser = parsed.user;
          console.log("[SUPABASE] Restauration synchrone de la session utilisateur hors-ligne:", initialUser?.email);
        }
      }
    } catch (e) {
      console.warn("[SUPABASE] Erreur lors de la lecture synchrone de la session:", e);
    }
    this._currentUser = new BehaviorSubject<User | null | undefined>(initialUser || null);

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: {
          getItem: (key: string) => window.localStorage.getItem(key),
          setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
          removeItem: (key: string) => window.localStorage.removeItem(key),
        } as any,
        lock: async (name: string, acquireTimeout: number, callback: () => Promise<any>) => await callback(),
        storageKey: 'ethernanos-launcher-auth',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce'
      }
    });
    
    // La vérification en ligne n'est lancée que si nous avons du réseau
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          this._currentUser.next(user);
        }
      }).catch(err => {
        console.warn("[SUPABASE] Impossible de rafraîchir la session via getUser:", err);
      });
    }

    // Écoute des changements d'état d'authentification
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log("[SUPABASE] Changement de statut d'authentification :", event);
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

  // Helper for fetching tenant info by authenticated user email
  async getTenantByEmail(email: string) {
    return await this.supabase
      .from('tenants')
      .select('*')
      .eq('contact_email', email)
      .single();
  }

  async getAppTenants(appId: string) {
    // 1. Get module IDs for this app
    const { data: modules } = await this.supabase
      .from('app_modules')
      .select('id')
      .eq('app_id', appId);
    
    if (!modules || modules.length === 0) return { data: [], error: null };
    const moduleIds = modules.map(m => m.id);

    // 2. Get unique tenants who have licenses for these modules
    // We select tenants via a join and order by created_at as a proxy for seniority/usage if count is missing
    return await this.supabase
      .from('tenant_licenses')
      .select(`
        tenants (
          name, 
          industry, 
          country
        )
      `)
      .in('module_id', moduleIds)
      .limit(20); // Get more than 12 to deduplicate if necessary in JS
  }

  async getAppReviews(appId: string) {
    return await this.supabase
      .from('app_reviews')
      .select('*')
      .eq('app_id', appId)
      .eq('is_published', true)
      .order('created_at', { ascending: false });
  }

  async submitReview(review: any) {
    return await this.supabase
      .from('app_reviews')
      .insert([review]);
  }
}
