<script setup>
import { Copy, Pencil, RefreshCw, UserMinus, UserPlus, Users, X } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import { addStudentToClass, getClass, regenerateClassInviteCode, removeStudentFromClass } from '../services/classApi';

const route = useRoute();
const classId = computed(() => route.params.id);
const classItem = ref(null);
const inviteCode = computed(() => classItem.value?.inviteCode || '');
const isLoading = ref(true);
const isBusy = ref(false);
const errorMessage = ref('');
const modalError = ref('');
const needsStudentDetails = ref(false);
const studentName = ref('');
const studentRegistration = ref('');
const isModalOpen = ref(false);
const studentEmail = ref('');
const copyStatus = ref('');

const loadClass = async () => {
    const id = classId.value;
    isLoading.value = true;
    classItem.value = null;
    errorMessage.value = '';
    copyStatus.value = '';
    isModalOpen.value = false;
    studentEmail.value = '';
    studentName.value = '';
    studentRegistration.value = '';
    needsStudentDetails.value = false;
    modalError.value = '';
    try {
        const data = await getClass(id);
        if (id === classId.value) classItem.value = data;
    } catch (error) {
        if (id === classId.value) errorMessage.value = error.message;
    } finally {
        if (id === classId.value) isLoading.value = false;
    }
};
watch(classId, loadClass, { immediate: true });

const copyInviteCode = async () => {
    copyStatus.value = '';

    try {
        if (!navigator.clipboard) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(inviteCode.value);
        copyStatus.value = 'Código copiado';
    } catch {
        copyStatus.value = 'Código disponível para copiar';
    }
};

const regenerateInviteCode = async () => {
    if (isBusy.value) return;
    const id = classId.value;
    isBusy.value = true;
    errorMessage.value = '';
    copyStatus.value = '';
    try {
        const data = await regenerateClassInviteCode(id);
        if (id === classId.value) {
            classItem.value = data;
            copyStatus.value = 'Código regenerado';
        }
    } catch (error) {
        if (id === classId.value) errorMessage.value = error.message;
    } finally {
        isBusy.value = false;
    }
};

const closeModal = () => {
    if (isBusy.value) return;
    isModalOpen.value = false;
    studentEmail.value = '';
    studentName.value = '';
    studentRegistration.value = '';
    needsStudentDetails.value = false;
    modalError.value = '';
};

const addStudent = async () => {
    if (isBusy.value) return;
    const id = classId.value;
    isBusy.value = true;
    modalError.value = '';
    let added = false;
    try {
        await addStudentToClass(id, {
            email: studentEmail.value,
            ...(needsStudentDetails.value ? {
                fullName: studentName.value, registration: studentRegistration.value
            } : {})
        });
        added = true;
    } catch (error) {
        if (id === classId.value) {
            modalError.value = error.message;
            if (error.code === 'STUDENT_DETAILS_REQUIRED') needsStudentDetails.value = true;
        }
    } finally {
        isBusy.value = false;
    }
    if (added && id === classId.value) {
        closeModal();
        await loadClass();
    }
};

const removeStudent = async (student) => {
    if (isBusy.value || !window.confirm(`Remover ${student.fullName} desta turma?`)) return;
    const id = classId.value;
    isBusy.value = true;
    errorMessage.value = '';
    let removed = false;
    try {
        await removeStudentFromClass(id, student.id);
        removed = true;
    } catch (error) {
        if (id === classId.value) errorMessage.value = error.message;
    } finally {
        isBusy.value = false;
    }
    if (removed && id === classId.value) await loadClass();
};
</script>

<template>
    <p v-if="isLoading" role="status">Carregando turma...</p>
    <p v-if="errorMessage" role="alert">{{ errorMessage }}</p>
    <button v-if="!isLoading && !classItem" class="button button--secondary" type="button" @click="loadClass">Tentar novamente</button>
    <section v-if="classItem" class="class-details-page">
        <header class="class-hero">
            <div class="class-hero__heading">
                <p class="eyebrow">Turma</p>
                <h1>{{ classItem.name }}</h1>
                <p>{{ classItem.subject }}</p>
                <RouterLink :to="`/turmas/${classItem.id}/editar`" class="button button--secondary">
                    <Pencil :size="17" />
                    Editar turma
                </RouterLink>
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
                <button class="button button--primary" type="button" :disabled="isBusy || classItem.status === 'archived'" @click="regenerateInviteCode">
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
                <p v-if="!classItem.students.length">Nenhum aluno vinculado.</p>
                <article v-for="student in classItem.students" :key="student.id" class="student-card">
                    <span class="student-card__avatar" aria-hidden="true">{{ student.fullName.charAt(0) }}</span>
                    <strong>{{ student.fullName }}</strong>
                    <button class="icon-button student-card__remove" type="button"
                        :aria-label="`Remover ${student.fullName} da turma`" title="Remover da turma"
                        :disabled="isBusy || classItem.status === 'archived'" @click="removeStudent(student)">
                        <UserMinus :size="18" />
                    </button>
                </article>
            </div>

            <button class="button button--secondary students-section__add" type="button" :disabled="isBusy || classItem.status === 'archived'" @click="isModalOpen = true">
                <UserPlus :size="17" />
                Adicionar aluno
            </button>
        </section>

        <div v-if="isModalOpen" class="modal-backdrop" role="presentation" @click.self="closeModal">
            <form class="modal" role="dialog" aria-modal="true" aria-labelledby="adicionar-aluno" @submit.prevent="addStudent" @keydown.esc="closeModal">
                <div class="modal__header">
                    <h2 id="adicionar-aluno">Adicionar aluno</h2>
                    <button class="icon-button" type="button" aria-label="Fechar modal" :disabled="isBusy" @click="closeModal">
                        <X :size="19" />
                    </button>
                </div>

                <label class="class-form-field">
                    <span>E-mail do aluno</span>
                    <input v-model="studentEmail" type="email" placeholder="aluno@catolicasc.edu.br" required maxlength="254" :disabled="isBusy" />
                </label>

                <template v-if="needsStudentDetails">
                    <label class="class-form-field">
                        <span>Nome do aluno</span>
                        <input v-model="studentName" type="text" required maxlength="150" :disabled="isBusy" />
                    </label>
                    <label class="class-form-field">
                        <span>Matrícula</span>
                        <input v-model="studentRegistration" type="text" required maxlength="40" :disabled="isBusy" />
                    </label>
                </template>
                <p v-if="modalError" role="alert">{{ modalError }}</p>
                <button class="button button--primary" type="submit" :disabled="isBusy">
                    <UserPlus :size="17" />
                    {{ isBusy ? 'Adicionando...' : 'Adicionar' }}
                </button>
            </form>
        </div>
    </section>
</template>

<style scoped>
.student-card {
    grid-template-columns: auto minmax(0, 1fr) auto;
}

.student-card__remove {
    justify-self: end;
}

.modal {
    max-height: calc(100dvh - 40px);
    overflow-y: auto;
}
</style>
