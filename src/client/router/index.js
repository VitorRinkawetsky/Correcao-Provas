import { createRouter, createWebHistory } from 'vue-router';

import AppShell from '../components/layout/AppShell.vue';
import ExamDetailsView from '../views/ExamDetailsView.vue';
import HomeView from '../views/HomeView.vue';
import AplicacoesView from '../views/AplicacoesView.vue';
import AplicacaoFormView from '../views/AplicacaoFormView.vue';
import AplicacaoDetalhesView from '../views/AplicacaoDetalhesView.vue';
import AplicacaoGerarView from '../views/AplicacaoGerarView.vue';
import AplicacaoVersoesView from '../views/AplicacaoVersoesView.vue';

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
                path: 'provas/:id',
                name: 'exam-details',
                component: ExamDetailsView,
                meta: { title: 'Detalhes da prova' }
            },
            {
                path: 'aplicacoes',
                name: 'applications',
                component: AplicacoesView,
                meta: { title: 'Aplicações' }
            },
            {
                path: 'aplicacoes/nova',
                name: 'application-create',
                component: AplicacaoFormView,
                meta: { title: 'Criar aplicação' }
            },
            {
                path: 'aplicacoes/:id/gerar',
                name: 'application-generate',
                component: AplicacaoGerarView,
                meta: { title: 'Gerar aplicação' }
            },
            {
                path: 'aplicacoes/:id/versoes',
                name: 'application-versions',
                component: AplicacaoVersoesView,
                meta: { title: 'Versões da prova' }
            },
            {
                path: 'aplicacoes/:id',
                name: 'application-details',
                component: AplicacaoDetalhesView,
                meta: { title: 'Detalhes da aplicação' }
            }
        ]
    },
    { path: '/index.html', redirect: '/' },
    {
        path: '/pages/prova-detalhes.html',
        redirect: (to) => `/provas/${Number(to.query.id) || 1}`
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
