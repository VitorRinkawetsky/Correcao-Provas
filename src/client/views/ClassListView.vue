<script setup>
import { ArrowRight, Plus, Users } from '@lucide/vue';
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import { getClasses } from '../services/classApi';

const classSummaries = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');

const loadClasses = async () => {
    isLoading.value = true;
    errorMessage.value = '';
    try {
        classSummaries.value = await getClasses();
    } catch (error) {
        errorMessage.value = error.message;
    } finally {
        isLoading.value = false;
    }
};
onMounted(loadClasses);
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
                <RouterLink to="/turmas/nova" class="button button--primary">
                    <Plus :size="17" />
                    Nova turma
                </RouterLink>
            </div>

            <p v-if="isLoading" role="status">Carregando turmas...</p>
            <div v-else-if="errorMessage">
                <p role="alert">{{ errorMessage }}</p>
                <button class="button button--secondary" type="button" @click="loadClasses">Tentar novamente</button>
            </div>
            <p v-else-if="!classSummaries.length">Nenhuma turma cadastrada.</p>
            <div v-else class="class-list">
                <RouterLink
                    v-for="classItem in classSummaries"
                    :key="classItem.id"
                    :to="`/turmas/${classItem.id}`"
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
