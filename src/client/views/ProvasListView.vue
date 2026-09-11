<script setup>
import { ArrowRight, Plus } from '@lucide/vue';
import { RouterLink } from 'vue-router';

import StatusBadge from '../components/ui/StatusBadge.vue';
import { getAllExams } from '../data/mockData';

const exams = getAllExams();
</script>

<template>
    <section class="exam-list-page">
        <header class="section-heading">
            <div>
                <p class="eyebrow">Sistema de Gestão de Provas</p>
                <h1>Provas</h1>
            </div>
            <RouterLink to="/provas/novo" class="button button--primary">
                <Plus :size="18" />
                Nova prova
            </RouterLink>
        </header>

        <ul class="exam-list">
            <li v-for="exam in exams" :key="exam.id" class="exam-list-card">
                <div class="exam-list-card__content">
                    <strong>{{ exam.title }}</strong>
                    <span>{{ exam.questionCount }} {{ exam.questionCount === 1 ? 'questão' : 'questões' }}</span>
                    <span class="exam-list-card__status">
                        Status:
                        <StatusBadge :status="exam.status" />
                    </span>
                </div>
                <RouterLink :to="`/provas/${exam.id}`" class="button button--secondary">
                    Abrir
                    <ArrowRight :size="17" />
                </RouterLink>
            </li>
        </ul>
    </section>
</template>
