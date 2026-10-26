<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import {
    associateCorrection,
    listApplicationStudents,
    listPendingCorrections
} from '../services/correctionsApi';

const route = useRoute();
const applicationId = computed(() => route.params.id);
const corrections = ref([]);
const students = ref([]);
const isLoading = ref(true);
const pageError = ref('');
const searchTerms = reactive({});
const selectedStudents = reactive({});
const rowErrors = reactive({});
const busyRows = reactive({});

const clearRecord = (record) => {
    for (const key of Object.keys(record)) delete record[key];
};

const matchingStudents = (correction) => {
    const query = String(searchTerms[correction.id] ?? '')
        .trim()
        .toLocaleLowerCase('pt-BR');

    if (!query) return students.value;

    return students.value.filter((student) => (
        student.fullName.toLocaleLowerCase('pt-BR').includes(query)
        || student.registration.toLocaleLowerCase('pt-BR').includes(query)
    ));
};

const initializeRows = () => {
    clearRecord(searchTerms);
    clearRecord(selectedStudents);
    clearRecord(rowErrors);
    clearRecord(busyRows);

    for (const correction of corrections.value) {
        const registration = correction.reportedStudentRegistration || '';
        searchTerms[correction.id] = registration;
        const exactMatches = students.value.filter(
            (student) => student.registration === registration
        );
        selectedStudents[correction.id] = exactMatches.length === 1
            ? exactMatches[0].id
            : '';
    }
};

const resetSelection = (correctionId) => {
    selectedStudents[correctionId] = '';
    rowErrors[correctionId] = '';
};

const loadPage = async () => {
    const requestedApplicationId = applicationId.value;
    isLoading.value = true;
    pageError.value = '';

    try {
        const [pendingData, studentData] = await Promise.all([
            listPendingCorrections(requestedApplicationId),
            listApplicationStudents(requestedApplicationId)
        ]);

        if (requestedApplicationId !== applicationId.value) return;
        corrections.value = pendingData;
        students.value = studentData;
        initializeRows();
    } catch (error) {
        if (requestedApplicationId !== applicationId.value) return;
        corrections.value = [];
        students.value = [];
        pageError.value = error.message || 'Não foi possível carregar as correções.';
    } finally {
        if (requestedApplicationId === applicationId.value) isLoading.value = false;
    }
};

const associate = async (correction) => {
    const studentId = Number(selectedStudents[correction.id]);
    if (!Number.isSafeInteger(studentId) || studentId < 1) {
        rowErrors[correction.id] = 'Selecione um aluno da turma.';
        return;
    }

    busyRows[correction.id] = true;
    rowErrors[correction.id] = '';

    try {
        await associateCorrection(correction.id, { studentId });
        corrections.value = corrections.value.filter((item) => item.id !== correction.id);
        delete searchTerms[correction.id];
        delete selectedStudents[correction.id];
        delete rowErrors[correction.id];
    } catch (error) {
        rowErrors[correction.id] = error.message || 'Não foi possível associar o aluno.';
    } finally {
        delete busyRows[correction.id];
    }
};

watch(applicationId, loadPage, { immediate: true });
</script>

<template>
    <section class="unidentified-corrections-page">
        <RouterLink
            :to="{ name: 'application-details', params: { id: applicationId } }"
            class="unidentified-corrections-page__back"
        >
            ← Voltar para a aplicação
        </RouterLink>

        <header class="unidentified-corrections-page__header">
            <div>
                <p class="eyebrow">Correções</p>
                <h1>Correções sem aluno</h1>
                <p>Associe cada correção ao aluno cuja matrícula foi informada na prova.</p>
            </div>
            <span v-if="!isLoading && !pageError" class="unidentified-corrections-page__count">
                {{ corrections.length }} pendente{{ corrections.length === 1 ? '' : 's' }}
            </span>
        </header>

        <p v-if="isLoading" role="status">Carregando correções...</p>

        <section v-else-if="pageError" class="unidentified-corrections-page__state" role="alert">
            <p>{{ pageError }}</p>
            <button class="button button--secondary" type="button" @click="loadPage">
                Tentar novamente
            </button>
        </section>

        <section
            v-else-if="!corrections.length"
            class="unidentified-corrections-page__state"
            role="status"
        >
            <h2>Nenhuma correção sem aluno</h2>
            <p>Todas as correções desta aplicação já estão associadas.</p>
        </section>

        <div v-else class="unidentified-corrections-list">
            <article
                v-for="correction in corrections"
                :key="correction.id"
                class="unidentified-correction-card"
                :data-correction-id="correction.id"
            >
                <header class="unidentified-correction-card__header">
                    <div>
                        <p class="eyebrow">Correção #{{ correction.id }}</p>
                        <h2>{{ correction.reportedStudentName || 'Nome não informado' }}</h2>
                    </div>
                    <span>Versão {{ correction.versionNumber }}</span>
                </header>

                <dl class="unidentified-correction-card__reported">
                    <div>
                        <dt>Matrícula informada</dt>
                        <dd>{{ correction.reportedStudentRegistration || 'Não informada' }}</dd>
                    </div>
                    <div>
                        <dt>Nota atual</dt>
                        <dd>{{ correction.totalScore }}</dd>
                    </div>
                </dl>

                <form class="unidentified-correction-card__form" @submit.prevent="associate(correction)">
                    <label :for="`student-search-${correction.id}`">
                        Buscar aluno da turma
                        <input
                            :id="`student-search-${correction.id}`"
                            v-model="searchTerms[correction.id]"
                            type="search"
                            maxlength="150"
                            placeholder="Nome ou matrícula"
                            :disabled="busyRows[correction.id]"
                            @input="resetSelection(correction.id)"
                        />
                    </label>

                    <label :for="`student-select-${correction.id}`">
                        Aluno
                        <select
                            :id="`student-select-${correction.id}`"
                            v-model="selectedStudents[correction.id]"
                            :disabled="busyRows[correction.id]"
                        >
                            <option value="">Selecione um aluno</option>
                            <option
                                v-for="student in matchingStudents(correction)"
                                :key="student.id"
                                :value="student.id"
                            >
                                {{ student.fullName }} — {{ student.registration }}
                            </option>
                        </select>
                    </label>

                    <p v-if="rowErrors[correction.id]" class="unidentified-correction-card__error" role="alert">
                        {{ rowErrors[correction.id] }}
                    </p>

                    <button
                        class="button button--primary"
                        type="submit"
                        :disabled="busyRows[correction.id] || !selectedStudents[correction.id]"
                    >
                        {{ busyRows[correction.id] ? 'Associando...' : 'Associar aluno' }}
                    </button>
                </form>
            </article>
        </div>
    </section>
</template>

<style scoped>
.unidentified-corrections-page {
    display: grid;
    gap: var(--space-8);
}

.unidentified-corrections-page__back {
    width: fit-content;
    color: var(--color-brand-700);
    font-weight: 700;
    text-decoration: none;
}

.unidentified-corrections-page__header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-5);
}

.unidentified-corrections-page__header h1,
.unidentified-correction-card h2 {
    margin: 0;
}

.unidentified-corrections-page__header > div > p:last-child {
    margin: var(--space-2) 0 0;
    color: var(--color-muted);
}

.unidentified-corrections-page__count {
    flex-shrink: 0;
    padding: var(--space-2) var(--space-3);
    border-radius: 999px;
    color: var(--color-brand-700);
    background: var(--color-brand-50);
    font-weight: 700;
}

.unidentified-corrections-page__state {
    display: grid;
    min-height: 220px;
    place-items: center;
    align-content: center;
    gap: var(--space-4);
    padding: var(--space-8);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    text-align: center;
    background: var(--color-surface);
}

.unidentified-corrections-list {
    display: grid;
    gap: var(--space-5);
}

.unidentified-correction-card {
    display: grid;
    gap: var(--space-5);
    padding: clamp(1.25rem, 4vw, 2rem);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
}

.unidentified-correction-card__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
}

.unidentified-correction-card__header > span {
    color: var(--color-muted);
    font-size: 0.9rem;
    font-weight: 700;
}

.unidentified-correction-card__reported {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4);
    margin: 0;
}

.unidentified-correction-card__reported div {
    padding: var(--space-4);
    border-radius: var(--radius-md);
    background: var(--color-bg);
}

.unidentified-correction-card__reported dt {
    color: var(--color-muted);
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
}

.unidentified-correction-card__reported dd {
    margin: var(--space-1) 0 0;
    color: var(--color-heading);
    font-weight: 750;
}

.unidentified-correction-card__form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
    align-items: end;
    gap: var(--space-4);
}

.unidentified-correction-card__form label {
    display: grid;
    gap: var(--space-2);
    color: var(--color-heading);
    font-size: 0.9rem;
    font-weight: 700;
}

.unidentified-correction-card__form input,
.unidentified-correction-card__form select {
    width: 100%;
    min-height: 44px;
    padding: 0 var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    background: var(--color-surface);
    font: inherit;
}

.unidentified-correction-card__form input:focus,
.unidentified-correction-card__form select:focus {
    border-color: var(--color-brand-500);
    outline: 2px solid var(--color-brand-100);
}

.unidentified-correction-card__error {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--color-danger-text);
    font-size: 0.9rem;
    font-weight: 650;
}

@media (max-width: 760px) {
    .unidentified-corrections-page__header,
    .unidentified-correction-card__header {
        align-items: flex-start;
        flex-direction: column;
    }

    .unidentified-correction-card__form {
        grid-template-columns: 1fr;
    }

    .unidentified-correction-card__form .button {
        width: 100%;
    }
}

@media (max-width: 480px) {
    .unidentified-correction-card__reported {
        grid-template-columns: 1fr;
    }
}
</style>
