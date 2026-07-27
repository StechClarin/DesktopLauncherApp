import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from './services/supabase.service';
import { filter, map, take } from 'rxjs/operators';
import { User } from '@supabase/supabase-js';

export const authGuard: CanActivateFn = (route, state) => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const isOffline = localStorage.getItem('hub-offline-mode') === 'true' || (typeof navigator !== 'undefined' && !navigator.onLine);
  if (isOffline) {
    return true;
  }

  return supabase.currentUser$.pipe(
    filter((user): user is User | null => user !== undefined),
    take(1),
    map(user => {
      if (user) {
        return true;
      } else {
        router.navigate(['/login']);
        return false;
      }
    })
  );
};
