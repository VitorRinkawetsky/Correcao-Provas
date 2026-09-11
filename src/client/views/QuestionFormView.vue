<script setup>
import { ArrowLeft, CheckCircle2, Plus, Save, Trash2 } from '@lucide/vue';
import { computed, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import { useQuestionStore, validateQuestionInput } from '../data/questionStore';

const route = useRoute();
const router = useRouter();
const { getQuestion, saveQuestion } = useQuestionStore();
const errors = ref({});
const correctAlternativeKey = ref('');
let alternativeKey = 0;

const form = reactive({
    statement: '',
    tags: '',
    alternatives: []
});

const questionId = computed(() => route.params.id ? Number(route.params.id) : null);
const isEditing = computed(() => questionId.value !== null);
const existingQuestion = computed(() => isEditing.value ? getQuestion(questionId.value) : null);
const questionNotFound = computed(() => isEditing.value && !existingQuestion.value);

const makeAlternative = (alternative = {}) => ({
    key: alternative.id ? `saved-${alternative.id}` : `new-${++alternativeKey}`,
    id: alternative.id ?? null,
    text: alternative.text ?? ''
});

const resetForm = () => {
    errors.value = {};

    if (existingQuestion.value) {
        form.statement = existingQuestion.value.statement;
        form.tags = existingQuestion.value.tags.join(', ');
        form.alternatives = existingQuestion.value.alternatives.map(makeAlternative);
        correctAlternativeKey.value = `saved-${existingQuestion.value.correctAlternativeId}`;
        return;
    }

    form.statement = '';
    form.tags = '';
    form.alternatives = [makeAlternative(), makeAlternative()];
    correctAlternativeKey.value = '';
};

watch(() => route.params.id, resetForm, { immediate: true });

const addAlternative = () => {
    if (form.alternatives.length >= 5) return;
    form.alternatives.push(makeAlternative());
    delete errors.value.alternatives;
};

const removeAlternative = (index) => {
    if (form.alternatives.length <= 2) return;

    const [removedAlternative] = form.alternatives.splice(index, 1);
    if (correctAlternativeKey.value === removedAlternative.key) {
        correctAlternativeKey.value = '';
    }
};

const handleSubmit = () => {
    const correctAlternativeIndex = form.alternatives.findIndex(
        (alternative) => alternative.key === correctAlternativeKey.value
    );
    const input = {
        statement: form.statement,
        tags: form.tags,
        alternatives: form.alternatives,
        correctAlternativeIndex
    };
    const validation = validateQuestionInput(input);
    errors.value = validation.errors;

    if (!validation.valid) return;

    saveQuestion(input, questionId.value);
    router.push({
        name: 'questions',
        query: { saved: isEditing.value ? 'updated' : 'created' }
    });
};
</script>

<template>
    <section v-if="!questionNotFound" class="question-form-page" aria-labelledby="question-form-title">
        <RouterLink to="/questoes" class="back-link">
            <ArrowLeft :size="17" aria-hidden="true" />
            Voltar ao banco de questões
        </RouterLink>

        <header class="question-form-page__header">
            <div>
                <p class="eyebrow">Questão objetiva</p>
                <h1 id="question-form-title">{{ isEditing ? 'Editar questão' : 'Nova questão' }}</h1>
                <p>Defina o enunciado, as alternativas e indique uma única resposta correta.</p>
            </div>

            <span class="question-form-page__type">
                <CheckCircle2 :size="17" aria-hidden="true" />
                Objetiva
            </span>
        </header>

        <form class="question-form" novalidate @submit.prevent="handleSubmit">
            <section class="form-section" aria-labelledby="statement-title">
                <div class="form-section__heading">
                    <span>1</span>
                    <div>
                        <h2 id="statement-title">Enunciado</h2>
                        <p>Escreva a pergunta de forma clara e completa.</p>
                    </div>
                </div>

                <label class="form-field">
                    <span>Enunciado da questão</span>
                    <textarea
                        v-model="form.statement"
                        rows="5"
                        placeholder="Digite o enunciado"
                        :aria-invalid="Boolean(errors.statement)"
                        aria-describedby="statement-error"
                    ></textarea>
                </label>
                <p v-if="errors.statement" id="statement-error" class="field-error">{{ errors.statement }}</p>
            </section>

            <fieldset class="form-section alternatives-section">
                <legend class="sr-only">Alternativas</legend>
                <div class="form-section__heading form-section__heading--split">
                    <span>2</span>
                    <div>
                        <h2>Alternativas</h2>
                        <p>Adicione de 2 a 5 opções e marque exatamente uma como correta.</p>
                    </div>
                    <strong>{{ form.alternatives.length }} de 5</strong>
                </div>

                <div class="alternatives-list">
                    <div
                        v-for="(alternative, index) in form.alternatives"
                        :key="alternative.key"
                        class="alternative-row"
                        :class="{ 'alternative-row--correct': correctAlternativeKey === alternative.key }"
                    >
                        <label class="alternative-correct">
                            <input
                                v-model="correctAlternativeKey"
                                type="radio"
                                name="correct-alternative"
                                :value="alternative.key"
                            />
                            <span class="alternative-letter">{{ String.fromCharCode(65 + index) }}</span>
                            <span class="sr-only">Marcar alternativa {{ String.fromCharCode(65 + index) }} como correta</span>
                        </label>

                        <label class="alternative-text">
                            <span class="sr-only">Texto da alternativa {{ String.fromCharCode(65 + index) }}</span>
                            <input
                                v-model="alternative.text"
                                type="text"
                                :placeholder="`Alternativa ${String.fromCharCode(65 + index)}`"
                            />
                        </label>

                        <button
                            type="button"
                            class="remove-alternative"
                            :disabled="form.alternatives.length <= 2"
                            :aria-label="`Remover alternativa ${String.fromCharCode(65 + index)}`"
                            @click="removeAlternative(index)"
                        >
                            <Trash2 :size="18" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                <p v-if="errors.alternatives" class="field-error">{{ errors.alternatives }}</p>
                <p v-if="errors.correctAlternativeId" class="field-error">{{ errors.correctAlternativeId }}</p>

                <button
                    type="button"
                    class="add-alternative"
                    :disabled="form.alternatives.length >= 5"
                    @click="addAlternative"
                >
                    <Plus :size="18" aria-hidden="true" />
                    {{ form.alternatives.length >= 5 ? 'Limite de 5 alternativas' : 'Adicionar alternativa' }}
                </button>
            </fieldset>

            <section class="form-section" aria-labelledby="tags-title">
                <div class="form-section__heading">
                    <span>3</span>
                    <div>
                        <h2 id="tags-title">Tags</h2>
                        <p>Use tags para localizar a questão no banco.</p>
                    </div>
                </div>

                <label class="form-field">
                    <span>Tags da questão</span>
                    <input
                        v-model="form.tags"
                        type="text"
                        placeholder="Ex.: Banco de Dados, Normalização"
                        aria-describedby="tags-hint"
                    />
                </label>
                <p id="tags-hint" class="field-hint">Separe múltiplas tags por vírgulas.</p>
            </section>

            <div class="question-form__actions">
                <RouterLink to="/questoes" class="button button--secondary">Cancelar</RouterLink>
                <button type="submit" class="button button--primary">
                    <Save :size="18" aria-hidden="true" />
                    Salvar questão
                </button>
            </div>
        </form>
    </section>

    <section v-else class="not-found-state">
        <p class="eyebrow">Banco de questões</p>
        <h1>Questão não encontrada.</h1>
        <p>Ela pode ter sido excluída ou o endereço está incorreto.</p>
        <RouterLink to="/questoes" class="button button--primary">Voltar ao banco de questões</RouterLink>
    </section>
</template>

<style scoped>
.question-form-page {
    display: grid;
    gap: var(--space-6);
}

.question-form-page__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-6);
}

.question-form-page__header h1 {
    margin-top: var(--space-2);
}

.question-form-page__header > div > p:last-child {
    max-width: 680px;
    margin-top: var(--space-3);
    color: var(--color-muted);
    font-size: 1rem;
    line-height: 1.6;
}

.question-form-page__type {
    display: inline-flex;
    min-height: 38px;
    align-items: center;
    gap: var(--space-2);
    padding-inline: var(--space-4);
    border: 1px solid var(--color-brand-100);
    border-radius: 999px;
    color: var(--color-brand-800);
    background: var(--color-brand-50);
    font-size: 0.86rem;
    font-weight: 750;
    white-space: nowrap;
}

.question-form {
    display: grid;
    gap: var(--space-5);
}

.form-section {
    min-width: 0;
    margin: 0;
    padding: clamp(1.25rem, 3vw, 2rem);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
}

.form-section__heading {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    gap: var(--space-3);
    margin-bottom: var(--space-5);
}

.form-section__heading > span {
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border-radius: 10px;
    color: #fff;
    background: var(--color-brand-800);
    font-size: 0.85rem;
    font-weight: 800;
}

.form-section__heading h2 {
    font-size: 1.2rem;
}

.form-section__heading p {
    margin-top: 5px;
    color: var(--color-muted);
    font-size: 0.9rem;
    line-height: 1.5;
}

.form-section__heading--split {
    grid-template-columns: auto minmax(0, 1fr) auto;
}

.form-section__heading--split > strong {
    padding: 6px 10px;
    border-radius: 999px;
    color: var(--color-muted);
    background: var(--color-bg);
    font-size: 0.8rem;
}

.form-field {
    display: grid;
    gap: var(--space-2);
    color: var(--color-heading);
    font-size: 0.9rem;
    font-weight: 700;
}

.form-field input,
.form-field textarea,
.alternative-text input {
    width: 100%;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    background: #fff;
    font: inherit;
}

.form-field input,
.alternative-text input {
    min-height: 48px;
    padding-inline: var(--space-4);
}

.form-field textarea {
    min-height: 132px;
    padding: var(--space-4);
    line-height: 1.6;
    resize: vertical;
}

.form-field input:focus,
.form-field textarea:focus,
.alternative-text input:focus {
    border-color: var(--color-brand-500);
    outline: 0;
    box-shadow: 0 0 0 3px rgba(35, 165, 143, 0.14);
}

.alternatives-list {
    display: grid;
    gap: var(--space-3);
}

.alternative-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--color-border-soft);
    border-radius: var(--radius-md);
    background: var(--color-bg);
    transition: border-color 160ms ease, background-color 160ms ease;
}

.alternative-row--correct {
    border-color: var(--color-brand-500);
    background: var(--color-brand-50);
}

.alternative-correct {
    position: relative;
    display: grid;
    cursor: pointer;
}

.alternative-correct input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
}

.alternative-letter {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border: 2px solid var(--color-border);
    border-radius: 50%;
    color: var(--color-muted);
    background: #fff;
    font-weight: 800;
}

.alternative-correct input:checked + .alternative-letter {
    border-color: var(--color-brand-700);
    color: #fff;
    background: var(--color-brand-700);
}

.alternative-correct input:focus-visible + .alternative-letter {
    outline: 3px solid rgba(35, 165, 143, 0.3);
    outline-offset: 3px;
}

.alternative-text {
    min-width: 0;
}

.remove-alternative {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border-radius: var(--radius-sm);
    color: var(--color-danger-text);
    background: transparent;
    cursor: pointer;
}

.remove-alternative:hover:not(:disabled) {
    background: var(--color-danger-bg);
}

.remove-alternative:disabled {
    color: #aeb9b6;
    cursor: not-allowed;
}

.add-alternative {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-4);
    padding-inline: var(--space-4);
    border: 1px dashed var(--color-brand-500);
    border-radius: var(--radius-md);
    color: var(--color-brand-800);
    background: transparent;
    cursor: pointer;
    font-weight: 750;
}

.add-alternative:hover:not(:disabled) {
    background: var(--color-brand-50);
}

.add-alternative:disabled {
    border-color: var(--color-border);
    color: var(--color-muted);
    cursor: not-allowed;
}

.field-error,
.field-hint {
    margin-top: var(--space-2);
    font-size: 0.85rem;
}

.field-error {
    color: var(--color-danger-text);
    font-weight: 650;
}

.field-hint {
    color: var(--color-muted);
}

.question-form__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding-top: var(--space-2);
}

@media (max-width: 640px) {
    .question-form-page__header {
        flex-direction: column;
    }

    .form-section__heading--split {
        grid-template-columns: auto minmax(0, 1fr);
    }

    .form-section__heading--split > strong {
        grid-column: 2;
        width: fit-content;
    }

    .alternative-row {
        grid-template-columns: auto minmax(0, 1fr);
    }

    .remove-alternative {
        grid-column: 2;
        justify-self: end;
    }

    .question-form__actions {
        flex-direction: column-reverse;
    }

    .question-form__actions .button {
        width: 100%;
    }
}
</style>
