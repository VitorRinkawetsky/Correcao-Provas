import { createRouter, createWebHistory } from 'vue-router';

import AppShell from '../components/layout/AppShell.vue';
import ExamDetailsView from '../views/ExamDetailsView.vue';
import HomeView from '../views/HomeView.vue';
import ProvaFormView from '../views/ProvaFormView.vue';
import ProvasListView from '../views/ProvasListView.vue';

const routes = [
    {
        path: '/',
        component: AppShell,
        children: [
            {
                path: '',
                name: 'home',
                component: HomeView,
                meta: { title: 'Página inicial' }
            },
            {
                path: 'provas',
                name: 'exam-list',
                component: ProvasListView,
                meta: { title: 'Provas' }
            },
            {
                path: 'provas/novo',
                name: 'exam-create',
                component: ProvaFormView,
                meta: { title: 'Nova prova' }
            },
            {
                path: 'provas/:id',
                name: 'exam-details',
                component: ExamDetailsView,
                meta: { title: 'Detalhes da prova' }
            },
            {
                path: 'provas/:id/editar',
                name: 'exam-edit',
                component: ProvaFormView,
                meta: { title: 'Editar prova' }
            }
        ]
    },
    { path: '/index.html', redirect: '/' },
    {
        path: '/pages/prova-detalhes.html',
        redirect: (to) => `/provas/${Number(to.query.id) || 1}`
    },
    {
        path: '/pages/provas.html',
        redirect: '/provas'
    },
    {
        path: '/pages/prova-form.html',
        redirect: (to) => (to.query.id ? `/provas/${Number(to.query.id)}/editar` : '/provas/novo')
    },
    { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior: () => ({ top: 0 })
});

router.afterEach((to) => {
    document.title = `${to.meta.title || 'SGP'} · SGP Católica`;
});

export default router;
