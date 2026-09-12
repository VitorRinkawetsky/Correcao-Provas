<script setup>
import { Copy, RefreshCw, UserPlus, Users, X } from '@lucide/vue';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

import { getClassDetails } from '../data/mockData';

const route = useRoute();
const classId = computed(() => Number(route.params.id || route.query.id) || 1);
const classItem = computed(() => getClassDetails(classId.value));
const inviteCode = ref(classItem.value?.inviteCode || 'AB82CD');
const isModalOpen = ref(false);
const studentEmail = ref('');
const copyStatus = ref('');

const copyInviteCode = async () => {
    copyStatus.value = '';

    try {
        await navigator.clipboard?.writeText(inviteCode.value);
        copyStatus.value = 'Código copiado';
    } catch {
        copyStatus.value = 'Código disponível para copiar';
    }
};

const regenerateInviteCode = () => {
    inviteCode.value = 'CD94EF';
    copyStatus.value = 'Código regenerado';
};

const closeModal = () => {
    isModalOpen.value = false;
    studentEmail.value = '';
};

const addStudent = () => {
    closeModal();
};
</script>

<template>
    <section v-if="classItem" class="class-details-page">
        <header class="class-hero">
            <div class="class-hero__heading">
                <p class="eyebrow">Turma</p>
                <h1>{{ classItem.name }}</h1>
                <p>{{ classItem.subject }}</p>
            </div>

            <dl class="class-summary">
                <div>
                    <dt>Disciplina</dt>
                    <dd>{{ classItem.subject }}</dd>
                </div>
                <div>
                    <dt>Período</dt>
                    <dd>{{ classItem.term }}</dd>
                </div>
            </dl>
        </header>

        <section class="invite-panel" aria-labelledby="codigo-convite">
            <div>
                <p class="eyebrow">Código de convite</p>
                <h2 id="codigo-convite">{{ inviteCode }}</h2>
                <p v-if="copyStatus" class="invite-panel__feedback" role="status">{{ copyStatus }}</p>
            </div>

            <div class="class-actions" aria-label="Ações do código de convite">
                <button class="button button--secondary" type="button" @click="copyInviteCode">
                    <Copy :size="17" />
                    Copiar
                </button>
                <button class="button button--primary" type="button" @click="regenerateInviteCode">
                    <RefreshCw :size="17" />
                    Regenerar
                </button>
            </div>
        </section>

        <section class="students-section" aria-labelledby="alunos-da-turma">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">Alunos</p>
                    <h2 id="alunos-da-turma">Alunos</h2>
                </div>
                <span class="section-heading__icon" aria-hidden="true">
                    <Users :size="21" :stroke-width="1.8" />
                </span>
            </div>

            <div class="student-list">
                <article v-for="student in classItem.students" :key="student.id" class="student-card">
                    <span class="student-card__avatar" aria-hidden="true">{{ student.fullName.charAt(0) }}</span>
                    <strong>{{ student.fullName }}</strong>
                </article>
            </div>

            <button class="button button--secondary students-section__add" type="button" @click="isModalOpen = true">
                <UserPlus :size="17" />
                Adicionar aluno
            </button>
        </section>

        <div v-if="isModalOpen" class="modal-backdrop" role="presentation" @click.self="closeModal">
            <form class="modal" aria-labelledby="adicionar-aluno" @submit.prevent="addStudent">
                <div class="modal__header">
                    <h2 id="adicionar-aluno">Adicionar aluno</h2>
                    <button class="icon-button" type="button" aria-label="Fechar modal" @click="closeModal">
                        <X :size="19" />
                    </button>
                </div>

                <label class="class-form-field">
                    <span>E-mail do aluno</span>
                    <input v-model="studentEmail" type="email" placeholder="aluno@catolicasc.edu.br" />
                </label>

                <button class="button button--primary" type="submit">Adicionar</button>
            </form>
        </div>
    </section>
</template>
