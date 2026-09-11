<script setup>
import { BookOpenCheck, Edit3, Plus, Search, Trash2 } from '@lucide/vue';
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import { useQuestionStore } from '../data/questionStore';

const route = useRoute();
const router = useRouter();
const search = ref('');
const selectedTag = ref('');
const { questions, deleteQuestion } = useQuestionStore();

const availableTags = computed(() => [...new Set(
    questions.value.flatMap((question) => question.tags)
)].sort((firstTag, secondTag) => firstTag.localeCompare(secondTag, 'pt-BR')));

const filteredQuestions = computed(() => {
    const normalizedSearch = search.value.trim().toLocaleLowerCase('pt-BR');

    return questions.value.filter((question) => {
        const matchesText = !normalizedSearch
            || question.statement.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
            || question.tags.some((tag) => tag.toLocaleLowerCase('pt-BR').includes(normalizedSearch));
        const matchesTag = !selectedTag.value || question.tags.includes(selectedTag.value);

        return matchesText && matchesTag;
    });
});

const feedbackMessage = computed(() => {
    if (route.query.saved === 'created') return 'Questão criada com sucesso.';
    if (route.query.saved === 'updated') return 'Questão atualizada com sucesso.';
    return '';
});

const clearFeedback = () => {
    if (!route.query.saved) return;
    const query = { ...route.query };
    delete query.saved;
    router.replace({ query });
};

const handleDelete = (question) => {
    const confirmed = window.confirm(`Excluir a questão “${question.statement}”?`);
    if (!confirmed) return;

    deleteQuestion(question.id);
};
</script>

<template>
    <section class="question-bank" aria-labelledby="question-bank-title">
        <header class="question-bank__header">
            <div>
                <p class="eyebrow">Gerenciamento</p>
                <h1 id="question-bank-title">Banco de questões</h1>
                <p>Crie e organize questões objetivas para suas provas.</p>
            </div>

            <RouterLink to="/questoes/nova" class="button button--primary">
                <Plus :size="18" aria-hidden="true" />
                Nova questão
            </RouterLink>
        </header>

        <div v-if="feedbackMessage" class="question-bank__feedback" role="status">
            <span>{{ feedbackMessage }}</span>
            <button type="button" @click="clearFeedback">Fechar</button>
        </div>

        <section class="question-bank__filters" aria-label="Filtros do banco de questões">
            <label class="filter-field filter-field--search">
                <span>Pesquisar</span>
                <span class="filter-control">
                    <Search :size="18" aria-hidden="true" />
                    <input
                        v-model="search"
                        type="search"
                        placeholder="Enunciado ou tag"
                    />
                </span>
            </label>

            <label class="filter-field">
                <span>Tags</span>
                <select v-model="selectedTag">
                    <option value="">Todas as tags</option>
                    <option v-for="tag in availableTags" :key="tag" :value="tag">{{ tag }}</option>
                </select>
            </label>
        </section>

        <div class="question-bank__summary" aria-live="polite">
            <strong>{{ filteredQuestions.length }}</strong>
            {{ filteredQuestions.length === 1 ? 'questão encontrada' : 'questões encontradas' }}
        </div>

        <div v-if="filteredQuestions.length" class="question-list" role="list">
            <article
                v-for="question in filteredQuestions"
                :key="question.id"
                class="question-item"
                role="listitem"
            >
                <div class="question-item__icon" aria-hidden="true">
                    <BookOpenCheck :size="21" />
                </div>

                <div class="question-item__content">
                    <div class="question-item__heading">
                        <h2>{{ question.statement }}</h2>
                        <span class="type-badge">Objetiva</span>
                    </div>

                    <ul class="tag-list" aria-label="Tags da questão">
                        <li v-for="tag in question.tags" :key="tag">{{ tag }}</li>
                        <li v-if="question.tags.length === 0" class="tag-list__empty">Sem tags</li>
                    </ul>
                </div>

                <div class="question-item__actions" aria-label="Ações da questão">
                    <RouterLink
                        :to="`/questoes/${question.id}/editar`"
                        class="button button--secondary button--compact"
                    >
                        <Edit3 :size="16" aria-hidden="true" />
                        Editar
                    </RouterLink>
                    <button
                        type="button"
                        class="button button--danger button--compact"
                        @click="handleDelete(question)"
                    >
                        <Trash2 :size="16" aria-hidden="true" />
                        Excluir
                    </button>
                </div>
            </article>
        </div>

        <div v-else class="question-bank__empty">
            <BookOpenCheck :size="32" aria-hidden="true" />
            <h2>Nenhuma questão encontrada</h2>
            <p>Ajuste os filtros ou crie uma nova questão objetiva.</p>
        </div>
    </section>
</template>

<style scoped>
.question-bank {
    display: grid;
    gap: var(--space-6);
}

.question-bank__header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-6);
}

.question-bank__header h1 {
    margin-top: var(--space-2);
}

.question-bank__header > div > p:last-child {
    margin-top: var(--space-3);
    color: var(--color-muted);
    font-size: 1rem;
}

.question-bank__feedback {
    display: flex;
    min-height: 48px;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-brand-100);
    border-radius: var(--radius-md);
    color: var(--color-brand-950);
    background: var(--color-brand-50);
}

.question-bank__feedback button {
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    color: var(--color-brand-800);
    background: transparent;
    cursor: pointer;
    font-weight: 700;
}

.question-bank__filters {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(210px, 0.32fr);
    gap: var(--space-4);
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
}

.filter-field {
    display: grid;
    gap: var(--space-2);
    color: var(--color-heading);
    font-size: 0.875rem;
    font-weight: 700;
}

.filter-control {
    display: flex;
    min-height: 46px;
    align-items: center;
    gap: var(--space-3);
    padding-inline: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-muted);
    background: #fff;
}

.filter-control:focus-within {
    border-color: var(--color-brand-500);
    box-shadow: 0 0 0 3px rgba(35, 165, 143, 0.14);
}

.filter-control input,
.filter-field select {
    width: 100%;
    min-height: 46px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    background: #fff;
    font: inherit;
    font-weight: 500;
}

.filter-control input {
    min-height: auto;
    padding: 0;
    border: 0;
    border-radius: 0;
    outline: 0;
}

.filter-field select {
    padding-inline: var(--space-3);
}

.question-bank__summary {
    color: var(--color-muted);
    font-size: 0.9rem;
}

.question-bank__summary strong {
    color: var(--color-heading);
}

.question-list {
    display: grid;
    gap: var(--space-3);
}

.question-item {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
}

.question-item__icon {
    display: grid;
    width: 44px;
    height: 44px;
    place-items: center;
    border-radius: var(--radius-md);
    color: var(--color-brand-800);
    background: var(--color-brand-50);
}

.question-item__content {
    min-width: 0;
}

.question-item__heading {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
}

.question-item h2 {
    min-width: 0;
    flex: 1;
    font-size: 1rem;
    line-height: 1.45;
    letter-spacing: -0.01em;
}

.type-badge {
    display: inline-flex;
    min-height: 28px;
    align-items: center;
    padding-inline: var(--space-3);
    border-radius: 999px;
    color: var(--color-brand-800);
    background: var(--color-brand-50);
    font-size: 0.78rem;
    font-weight: 750;
    white-space: nowrap;
}

.tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: var(--space-3) 0 0;
    padding: 0;
    list-style: none;
}

.tag-list li {
    padding: 5px 9px;
    border: 1px solid var(--color-border-soft);
    border-radius: 999px;
    color: var(--color-muted);
    background: var(--color-bg);
    font-size: 0.78rem;
}

.tag-list .tag-list__empty {
    border-style: dashed;
}

.question-item__actions {
    display: flex;
    gap: var(--space-2);
}

.button--compact {
    min-height: 40px;
    padding-inline: var(--space-3);
    font-size: 0.84rem;
}

.button--danger {
    border-color: #f2cecb;
    color: var(--color-danger-text);
    background: var(--color-surface);
}

.button--danger:hover {
    border-color: #eab4b0;
    background: var(--color-danger-bg);
}

.question-bank__empty {
    display: grid;
    min-height: 260px;
    place-items: center;
    align-content: center;
    gap: var(--space-3);
    padding: var(--space-8);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
    color: var(--color-muted);
    text-align: center;
    background: rgba(255, 255, 255, 0.55);
}

.question-bank__empty h2 {
    font-size: 1.2rem;
}

@media (max-width: 820px) {
    .question-bank__header,
    .question-item__heading {
        align-items: flex-start;
        flex-direction: column;
    }

    .question-bank__filters {
        grid-template-columns: 1fr;
    }

    .question-item {
        grid-template-columns: auto minmax(0, 1fr);
        align-items: start;
    }

    .question-item__actions {
        grid-column: 2;
        flex-wrap: wrap;
    }
}

@media (max-width: 520px) {
    .question-bank__header .button,
    .question-item__actions,
    .question-item__actions .button {
        width: 100%;
    }

    .question-item {
        grid-template-columns: 1fr;
    }

    .question-item__icon {
        display: none;
    }

    .question-item__actions {
        grid-column: 1;
    }
}
</style>
