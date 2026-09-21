import { Subject } from 'rxjs';
import { SupabaseService } from './supabase.service';

/**
 * Provider de test : mocke SupabaseService pour les tests de composants.
 *
 * Le vrai SupabaseService (BehaviorSubject + SupabaseClient) déclenche des
 * appels réseau async et, via HubDataService.init(), efface les signaux
 * d'état (installedApps/availableApps) dès la souscription.
 *
 * On expose un `currentUser$` qui n'émet jamais (Subject simple) afin que
 * l'état injecté dans le test reste stable.
 */
export const MOCK_SUPABASE_PROVIDER = {
    provide: SupabaseService,
    useValue: {
        currentUser$: new Subject(),
        signIn: async () => ({ data: null, error: null }),
        signOut: async () => {},
        getTenantByEmail: async () => ({ data: null, error: null }),
        getAppTenants: async () => ({ data: [], error: null }),
        getAppReviews: async () => ({ data: [], error: null }),
        submitReview: async () => ({ data: null, error: null }),
        client: null,
    },
};
