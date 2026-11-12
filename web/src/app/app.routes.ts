import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./pages/home.page').then((m) => m.HomePage) },
  {
    path: 'practicar',
    children: [
      { path: '', loadComponent: () => import('./practice/topic.page').then((m) => m.TopicPage) },
      { path: 'cuestionario', loadComponent: () => import('./practice/quiz.page').then((m) => m.QuizPage) },
      { path: 'resultado', loadComponent: () => import('./practice/result.page').then((m) => m.ResultPage) },
    ],
  },
  { path: 'diagnosticar', loadComponent: () => import('./diagnose/diagnosticar.page').then((m) => m.DiagnosticarPage) },
  { path: 'acerca', loadComponent: () => import('./pages/acerca.page').then((m) => m.AcercaPage) },
  { path: '**', redirectTo: '' },
];
