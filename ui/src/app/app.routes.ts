import { Routes } from '@angular/router';
import { HubLayoutComponent } from './layout/hub-layout/hub-layout.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'hub',
        pathMatch: 'full'
    },
    {
        path: 'hub',
        component: HubLayoutComponent
    }
];
