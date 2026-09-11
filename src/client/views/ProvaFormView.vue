<script setup>
import { ArrowLeft, GripVertical, Plus, Save, Trash2 } from '@lucide/vue';
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import {
    createExam,
    formatScore,
    getExamById,
    getExamQuestions,
    getQuestionShortLabel,
    questions,
    updateExam
} from '../data/mockData';

const route = useRoute();
const router = useRouter();

const examId = computed(() => (route.params.id ? Number(route.params.id) : null));
const existingExam = computed(() => (examId.value ? getExamById(examId.value) : null));
const isEditMode = computed(() => Boolean(existingExam.value));

const title = ref(existingExam.value?.title || '');
const description = ref(existingExam.value?.description || '');
const formQuestions = ref(
    existingExam.value
        ? getExamQuestions(examId.value).map((question) => ({ questionId: question.id, score: question.score }))
        : []
);

const selectedQuestionId = ref('');
const titleError = ref(false);
const dragIndex = ref(null);

const questionById = (questionId) => questions.find((question) => question.id === questionId);

const availableQuestions = computed(() => {
    const usedIds = new Set(formQuestions.value.map((item) => item.questionId));
    return questions.filter((question) => !usedIds.has(question.id));
});

const totalScore = computed(() => formQuestions.value.reduce((total, item) => total + (Number(item.score) || 0), 0));

const questionOptionLabel = (question) => `${getQuestionShortLabel(question)} — ${question.statement}`;

const addQuestion = () => {
    if (!selectedQuestionId.value) return;
    const question = questionById(Number(selectedQuestionId.value));
    if (!question) return;
    formQuestions.value.push({ questionId: question.id, score: question.maxScore || 1 });
    selectedQuestionId.value = '';
};

const removeQuestion = (index) => {
    formQuestions.value.splice(index, 1);
};

const onDragStart = (index) => {
    dragIndex.value = index;
};

const onDrop = (index) => {
    if (dragIndex.value === null || dragIndex.value === index) return;
    const [item] = formQuestions.value.splice(dragIndex.value, 1);
    formQuestions.value.splice(index, 0, item);
    dragIndex.value = null;
};

const handleSubmit = () => {
    if (!title.value.trim()) {
        titleError.value = true;
        return;
    }
    titleError.value = false;

    const payload = {
        title: title.value.trim(),
        description: description.value.trim(),
        questions: formQuestions.value.map((item, index) => ({
            questionId: item.questionId,
            order: index + 1,
            score: Number(item.score) || 0
        }))
    };

    const savedExam = isEditMode.value ? updateExam(examId.value, payload) : createExam(payload);
    router.push(`/provas/${savedExam.id}`);
};

const cancelHref = computed(() => (isEditMode.value ? `/provas/${examId.value}` : '/'));
</script>

<template>
    <section class="exam-form-page">
        <RouterLink :to="cancelHref" class="back-link">
            <ArrowLeft :size="17" />
            {{ isEditMode ? 'Voltar para os detalhes da prova' : 'Voltar para a página inicial' }}
        </RouterLink>

        <header class="section-heading">
            <div>
                <p class="eyebrow">{{ isEditMode ? 'Editar prova' : 'Nova prova' }}</p>
                <h1>{{ isEditMode ? 'Editar prova' : 'Criar prova' }}</h1>
            </div>
        </header>

        <form class="exam-form" novalidate @submit.prevent="handleSubmit">
            <div class="form-field">
                <label class="form-label" for="exam-title">Título</label>
                <input
                    id="exam-title"
                    v-model="title"
                    class="form-input"
                    type="text"
                    placeholder="Ex.: P1 - Banco de Dados"
                    @input="titleError = false"
                />
                <p v-if="titleError" class="form-error">Informe um título para a prova.</p>
            </div>

            <div class="form-field">
                <label class="form-label" for="exam-description">Descrição</label>
                <textarea
                    id="exam-description"
                    v-model="description"
                    class="form-textarea"
                    rows="3"
                    placeholder="Descreva o objetivo desta avaliação"
                />
            </div>

            <div class="form-field">
                <div class="section-heading">
                    <p class="form-label">Questões</p>
                    <span class="questions-section__count">
                        {{ formatScore(totalScore) }} {{ totalScore === 1 ? 'ponto' : 'pontos' }}
                    </span>
                </div>

                <ul class="question-form-list">
                    <li
                        v-for="(item, index) in formQuestions"
                        :key="item.questionId"
                        class="question-form-row"
                        draggable="true"
                        @dragstart="onDragStart(index)"
                        @dragover.prevent
                        @drop="onDrop(index)"
                    >
                        <span class="question-form-row__handle" aria-hidden="true">
                            <GripVertical :size="18" />
                        </span>
                        <span class="question-form-row__content">
                            <strong>{{ getQuestionShortLabel(questionById(item.questionId)) }}</strong>
                            <small>{{ questionById(item.questionId)?.statement }}</small>
                        </span>
                        <input
                            v-model="item.score"
                            class="form-input question-form-row__score"
                            type="number"
                            min="0"
                            step="0.5"
                            :aria-label="`Pontuação da questão ${getQuestionShortLabel(questionById(item.questionId))}`"
                        />
                        <button
                            class="question-form-row__remove"
                            type="button"
                            :aria-label="`Remover questão ${getQuestionShortLabel(questionById(item.questionId))}`"
                            @click="removeQuestion(index)"
                        >
                            <Trash2 :size="17" />
                        </button>
                    </li>
                </ul>

                <div class="question-picker">
                    <select v-model="selectedQuestionId" class="form-input" aria-label="Selecionar questão para adicionar">
                        <option value="">Selecione uma questão…</option>
                        <option v-for="question in availableQuestions" :key="question.id" :value="question.id">
                            {{ questionOptionLabel(question) }}
                        </option>
                    </select>
                    <button class="button button--secondary" type="button" :disabled="!selectedQuestionId" @click="addQuestion">
                        <Plus :size="17" />
                        Adicionar questão
                    </button>
                </div>
            </div>

            <div class="exam-form__actions">
                <button class="button button--primary" type="submit">
                    <Save :size="17" />
                    Salvar prova
                </button>
            </div>
        </form>
    </section>
</template>
