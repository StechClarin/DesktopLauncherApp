import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../core/services/hub.service';
import { AppCardComponent } from '../../components/app-card/app-card.component';
import { ModuleCardComponent } from '../../components/module-card/module-card.component';
import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-store-view',
  standalone: true,
  imports: [CommonModule, AppCardComponent, ModuleCardComponent, FormsModule],
  templateUrl: './store-view.component.html',
  styleUrl: './store-view.component.scss',
  animations: [
    trigger('staggerList', [
      transition(':enter', [
        query('.stagger-item', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(50, [
            animate('400ms cubic-bezier(0.23, 1, 0.32, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('800ms ease-out', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class StoreViewComponent {
  hubService = inject(HubService);

  searchQuery = signal<string>('');
  selectedCategory = signal<string>('Tout');

  categories = ['Tout', 'Nouveautés', 'Modules', 'Productivité', 'Utilitaires'];

  filteredCatalog = computed(() => {
    const apps = this.hubService.storeCatalog();
    const query = this.searchQuery().toLowerCase();
    const category = this.selectedCategory();

    return apps.filter(app => {
      const matchesSearch = app.name.toLowerCase().includes(query) || 
                            app.description?.toLowerCase().includes(query);
      const matchesCategory = category === 'Tout' || app.category === category;
      return matchesSearch && matchesCategory;
    });
  });

  openAppDetails(app: any) {
    this.hubService.selectedApp.set(app);
  }

  setCategory(cat: string) {
    this.selectedCategory.set(cat);
  }
}
