import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../core/services/hub.service';
import { AppCardComponent } from '../../components/app-card/app-card.component';
import { ModuleCardComponent } from '../../components/module-card/module-card.component';

@Component({
  selector: 'app-store-view',
  standalone: true,
  imports: [CommonModule, AppCardComponent, ModuleCardComponent],
  templateUrl: './store-view.component.html',
  styleUrl: './store-view.component.scss'
})
export class StoreViewComponent {
  hubService = inject(HubService);

  openAppDetails(app: any) {
    this.hubService.selectedApp.set(app);
  }
}
