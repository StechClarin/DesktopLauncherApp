import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../core/services/hub.service';

@Component({
  selector: 'app-hub-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hub-sidebar.component.html',
  styleUrl: './hub-sidebar.component.scss'
})
export class HubSidebarComponent {
  hubService = inject(HubService);

  // Inputs
  isSidebarOpen = input.required<boolean>();
  activeTab = input.required<string>();

  // Outputs
  tabChange = output<'home' | 'library' | 'store' | 'downloads' | 'settings'>();

  setActiveTab(tab: 'home' | 'library' | 'store' | 'downloads' | 'settings') {
    this.tabChange.emit(tab);
  }
}
