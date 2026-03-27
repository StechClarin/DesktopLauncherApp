import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubService } from '../../../../../../core/services/hub.service';

@Component({
  selector: 'app-library-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './library-stats.component.html',
  styleUrl: './library-stats.component.scss'
})
export class LibraryStatsComponent {
  hubService = inject(HubService);
}
