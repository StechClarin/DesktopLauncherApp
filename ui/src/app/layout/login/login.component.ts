import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  isLoading = signal(false);
  error = signal<string | null>(null);

  async onLogin() {
    if (!this.email() || !this.password()) {
      this.error.set('Veuillez remplir tous les champs.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.signIn(this.email(), this.password());
      
      if (error) {
        this.error.set(error.message);
      } else if (data.user) {
        this.router.navigate(['/hub']);
      }
    } catch (err: any) {
      this.error.set('Une erreur inattendue est survenue.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
