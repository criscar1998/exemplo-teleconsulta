import { Routes } from '@angular/router';
import { CallComponent } from './page/call/call.component';
import { HomeComponent } from './page/home/home.component';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent
    },
    {
        path: 'chamada/:id',
        component: CallComponent
    },
];
