<script setup>
import { Archive, ArrowLeft, Edit3, FilePlus2, FileText, ListChecks } from '@lucide/vue';
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import StatusBadge from '../components/ui/StatusBadge.vue';
import { formatScore, getExamDetails } from '../data/mockData';

const route = useRoute();
const exam = computed(() => getExamDetails(route.params.id));
</script>

<template>
    <section v-if="exam" class="exam-details-page">
        <RouterLink to="/" class="back-link">
            <ArrowLeft :size="17" />
            Voltar para a página inicial
        </RouterLink>

        <header class="exam-hero">
            <div class="exam-hero__heading">
                <div class="exam-hero__status">
                    <StatusBadge :status="exam.status" />
                    <span>Prova #{{ exam.id }}</span>
                </div>
                <h1>{{ exam.title }}</h1>
                <p>{{ exam.description }}</p>
            </div>

            <div class="exam-actions" aria-label="Ações da prova">
                <RouterLink :to="`/provas/${exam.id}/editar`" class="button button--secondary">
                    <Edit3 :size="17" />
                    Editar
                </RouterLink>
                <button class="button button--primary" type="button">
                    <FilePlus2 :size="17" />
                    Criar aplicação
                </button>
                <button class="button button--secondary" type="button">
                    <Archive :size="17" />
                    Arquivar
                </button>
            </div>

            <dl class="exam-summary">
                <div>
                    <dt><ListChecks :size="18" /> Questões</dt>
                    <dd>{{ exam.questionCount }}</dd>
                </div>
                <div>
                    <dt><FileText :size="18" /> Pontuação</dt>
                    <dd>{{ formatScore(exam.totalScore) }}</dd>
                </div>
            </dl>
        </header>

        <section class="questions-section" aria-labelledby="questoes-da-prova">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">Composição</p>
                    <h2 id="questoes-da-prova">Questões da prova</h2>
                </div>
                <span class="questions-section__count">
                    {{ exam.questionCount }} {{ exam.questionCount === 1 ? 'questão' : 'questões' }}
                </span>
            </div>

            <div class="question-list">
                <article v-for="question in exam.questions" :key="question.id" class="question-card">
                    <span class="question-card__order" aria-hidden="true">{{ question.order }}</span>
                    <p>{{ question.statement }}</p>
                    <strong>Valor: {{ formatScore(question.score) }}</strong>
                </article>
            </div>
        </section>
    </section>

    <section v-else class="not-found-state">
        <span class="not-found-state__icon" aria-hidden="true">
            <FileText :size="32" :stroke-width="1.6" />
        </span>
        <p class="eyebrow">Detalhes da prova</p>
        <h1>Prova não encontrada.</h1>
        <p>Não foi possível localizar uma avaliação com esse identificador.</p>
        <RouterLink to="/" class="button button--primary">Voltar para a página inicial</RouterLink>
    </section>
</template>
