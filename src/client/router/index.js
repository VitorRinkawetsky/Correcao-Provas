import { createRouter, createWebHashHistory } from 'vue-router';

import AppShell from '../components/layout/AppShell.vue';
import ClassDetailsView from '../views/ClassDetailsView.vue';
import ClassFormView from '../views/ClassFormView.vue';
import ClassListView from '../views/ClassListView.vue';
import ExamDetailsView from '../views/ExamDetailsView.vue';
import HomeView from '../views/HomeView.vue';
import QuestionBank from '../views/QuestionBank.vue';
import QuestionFormView from '../views/QuestionFormView.vue';
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
                path: 'questoes',
                name: 'questions',
                component: QuestionBank,
                meta: { title: 'Banco de questões' }
            },
            {
                path: 'questoes/nova',
                name: 'question-new',
                component: QuestionFormView,
                meta: { title: 'Nova questão' }
            },
            {
                path: 'questoes/:id/editar',
                name: 'question-edit',
                component: QuestionFormView,
                meta: { title: 'Editar questão' }
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
        path: '/pages/questoes.html',
        redirect: '/questoes'
    },
    {
        path: '/pages/questao-form.html',
        redirect: (to) => {
            const questionId = Number(to.query.id);
            return {
                path: questionId > 0 ? `/questoes/${questionId}/editar` : '/questoes/nova',
                query: {}
            };
        }
    },
    {
        path: '/pages/prova-detalhes.html',
        redirect: (to) => `/provas/${Number(to.query.id) || 1}`
    },
    { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
    history: createWebHashHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior: () => ({ top: 0 })
});

router.afterEach((to) => {
    document.title = `${to.meta.title || 'SGP'} · SGP Católica`;
});

export default router;
