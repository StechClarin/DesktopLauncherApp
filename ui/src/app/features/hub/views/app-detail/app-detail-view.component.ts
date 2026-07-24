import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HubService } from '../../../../core/services/hub.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ModuleCardComponent } from '../../components/module-card/module-card.component';

@Component({
  selector: 'app-app-detail-view',
  standalone: true,
  imports: [CommonModule, ModuleCardComponent, FormsModule],
  templateUrl: './app-detail-view.component.html',
  styleUrl: './app-detail-view.component.scss'
})
export class AppDetailViewComponent {
  hubService = inject(HubService);
  private supabase = inject(SupabaseService);
  private sanitizer = inject(DomSanitizer);

  app = this.hubService.selectedApp;

  // Real Data State
  tenants = signal<any[]>([]);
  reviews = signal<any[]>([]);
  isLoadingSocial = signal(false);

  // Review Modal State
  showReviewModal = signal(false);
  newReview = signal({
    author: '',
    country: '',
    rating: 5,
    comment: ''
  });

  // Sync Progress State
  syncProgress = signal<number>(0);

  constructor() {
    // Re-fetch data whenever the selected app changes
    effect(async () => {
      const app = this.app();
      if (app) {
        this.loadSocialData(app.id);
      }
    });

    // Progress bar simulation for sync button
    let intervalId: any = null;
    effect(() => {
      const isSyncing = this.hubService.isSyncing();
      if (isSyncing) {
        this.syncProgress.set(0);
        intervalId = setInterval(() => {
          this.syncProgress.update(p => {
            if (p < 30) return p + 10;
            if (p < 75) return p + 5;
            if (p < 95) return p + 1;
            return p;
          });
        }, 600);
      } else {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        if (this.syncProgress() > 0) {
          this.syncProgress.set(100);
          setTimeout(() => {
            if (!this.hubService.isSyncing()) {
              this.syncProgress.set(0);
            }
          }, 1000);
        }
      }
    });
  }

  async loadSocialData(appId: string) {
    this.isLoadingSocial.set(true);
    try {
      const [tenantsRes, reviewsRes] = await Promise.all([
        this.supabase.getAppTenants(appId),
        this.supabase.getAppReviews(appId)
      ]);

      // Process Tenants (Deduplicate and take top 12)
      if (tenantsRes.data) {
        const rawTenants = tenantsRes.data
          .map((t: any) => t.tenants)
          .filter((t: any) => t !== null);
        
        // Simple deduplication by name
        const uniqueTenants = Array.from(new Map(rawTenants.map((t: any) => [t.name, t])).values());
        this.tenants.set(uniqueTenants.slice(0, 12));
      }

      // Process Reviews
      if (reviewsRes.data && reviewsRes.data.length > 0) {
        this.reviews.set(reviewsRes.data.map((r: any) => ({
          author: r.author_name,
          company: r.company_name || 'Utilisateur',
          country: r.country,
          rating: r.rating,
          comment: r.comment
        })));
      } else {
        // Fallback to static reviews if none in DB
        this.reviews.set([
          { author: 'Jean Dupont', company: 'Lycée Excellence', country: 'Sénégal', rating: 5, comment: 'Une solution robuste qui a transformé notre gestion quotidienne. Je recommande vivement !' },
          { author: 'Marie Curie', company: 'Clinique Horizon', country: 'France', rating: 4, comment: 'L\'interface est intuitive et le support technique très réactif. Très bon outil.' }
        ]);
      }
    } catch (e) {
      console.error("Failed to load social data:", e);
    } finally {
      this.isLoadingSocial.set(false);
    }
  }

  openReviewModal() {
    this.newReview.set({ author: '', country: '', rating: 5, comment: '' });
    this.showReviewModal.set(true);
  }

  closeReviewModal() {
    this.showReviewModal.set(false);
  }

  setRating(rating: number) {
    this.newReview.update(r => ({ ...r, rating }));
  }

  async submitReview() {
    const app = this.app();
    if (!app) return;

    const reviewData = this.newReview();
    if (!reviewData.author || !reviewData.comment) return;

    try {
      const { error } = await this.supabase.submitReview({
        app_id: app.id,
        author_name: reviewData.author,
        country: reviewData.country,
        rating: reviewData.rating,
        comment: reviewData.comment,
        is_published: false // Needs moderation by default
      });

      if (error) throw error;
      
      this.closeReviewModal();
      // Inform user that it's pending moderation (simulated here)
      alert("Merci ! Votre avis a été envoyé et sera publié après modération.");
    } catch (e) {
      console.error("Failed to submit review:", e);
      alert("Erreur lors de l'envoi de l'avis.");
    }
  }

  close() {
    this.hubService.selectedApp.set(null);
  }

  getSafeSvg(svgString?: string): SafeHtml {
    if (!svgString) return '';
    return this.sanitizer.bypassSecurityTrustHtml(svgString);
  }

  launchApp(app: any) {
    this.hubService.launchApp(app);
  }

  installApp(app: any) {
    this.hubService.state.showInstallationWizard.set(app);
  }

  uninstallApp(app: any) {
    this.hubService.uninstallApp(app.id);
  }

  isInstalled(appId: string): boolean {
    return this.hubService.installedApps().some((a: any) => a.id === appId);
  }

  isInstalling(appId: string): boolean {
    return this.hubService.installingApps().some((a: any) => a.id === appId);
  }

  pauseDownload(appId: string) {
    this.hubService.pauseDownload(appId);
  }

  resumeDownload(appId: string) {
    this.hubService.resumeDownload(appId);
  }

  cancelDownload(appId: string) {
    this.hubService.cancelDownload(appId);
  }

  deepSync(appId: string) {
    this.hubService.executeDeepSync(appId);
  }

  pullSync() {
    this.hubService.pullSync();
  }

  pushSync(appId: string) {
    this.hubService.pushSync(appId);
  }

  openStoreItem(appId: string) {
    this.hubService.openStoreItem(appId);
  }

  getStars(rating: number): number[] {
    return Array(rating).fill(0);
  }
}
