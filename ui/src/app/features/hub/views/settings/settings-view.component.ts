import { DbConfig } from '../../../../core/models/hub.models';

@Component({
  selector: 'app-settings-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-view.component.html',
  styleUrl: './settings-view.component.scss'
})
export class SettingsViewComponent {
  hubService = inject(HubService);
  audioService = inject(AudioService);
  appearanceService = inject(AppearanceService);
  
  // Typed colors for the template
  accentColors: AccentColor[] = ['purple', 'blue', 'emerald', 'amber', 'rose', 'cyan'];

  // Navigation
  activeSection = signal<'update' | 'about' | 'experience' | 'appearance' | 'network'>('appearance');

  setSection(section: 'update' | 'about' | 'experience' | 'appearance' | 'network') {
    this.activeSection.set(section);
  }
}
