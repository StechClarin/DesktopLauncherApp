import { Routes } from '@angular/router';
import { HubLayoutComponent } from './layout/hub-layout/hub-layout.component';
import { LoginComponent } from './layout/login/login.component';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'hub',
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'hub',
        component: HubLayoutComponent,
        canActivate: [authGuard]
    }
];
