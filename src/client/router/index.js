import { createRouter, createWebHistory } from 'vue-router';

import AppShell from '../components/layout/AppShell.vue';
import ExamDetailsView from '../views/ExamDetailsView.vue';
import HomeView from '../views/HomeView.vue';
import QuestionBank from '../views/QuestionBank.vue';
import QuestionFormView from '../views/QuestionFormView.vue';

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
    history: createWebHistory(),
    routes,
    scrollBehavior: () => ({ top: 0 })
});

router.afterEach((to) => {
    document.title = `${to.meta.title || 'SGP'} · SGP Católica`;
});

export default router;
