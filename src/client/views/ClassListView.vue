<script setup>
import { ArrowRight, Plus, Users } from '@lucide/vue';
import { RouterLink } from 'vue-router';

import { getClassSummaries } from '../data/mockData';

const classSummaries = getClassSummaries();
</script>

<template>
    <section class="class-list-page">
        <header class="form-hero">
            <p class="eyebrow">Turmas</p>
            <h1>Turmas</h1>
        </header>

        <section class="classes-section" aria-labelledby="turmas-disponiveis">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">Listagem</p>
                    <h2 id="turmas-disponiveis">Turmas disponíveis</h2>
                </div>
                <RouterLink to="/pages/turma-form.html" class="button button--primary">
                    <Plus :size="17" />
                    Nova turma
                </RouterLink>
            </div>

            <div class="class-list">
                <RouterLink
                    v-for="classItem in classSummaries"
                    :key="classItem.id"
                    :to="`/pages/turma-detalhes.html?id=${classItem.id}`"
                    class="class-list-card"
                >
                    <span class="class-list-card__icon" aria-hidden="true">
                        <Users :size="23" :stroke-width="1.7" />
                    </span>
                    <span class="class-list-card__content">
                        <strong>{{ classItem.name }}</strong>
                        <span>{{ classItem.subject }} · {{ classItem.term }}</span>
                        <small>{{ classItem.studentCount }} alunos</small>
                    </span>
                    <ArrowRight class="class-list-card__arrow" :size="20" aria-hidden="true" />
                </RouterLink>
            </div>
        </section>
    </section>
</template>
