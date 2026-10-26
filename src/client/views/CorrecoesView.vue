<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import StatusBadge from '../components/ui/StatusBadge.vue';
import {
    createCorrection,
    getCorrectionFormOptions,
    getVersionQuestions,
    listCorrections
} from '../services/correctionsApi';

const route = useRoute();
const applicationId = computed(() => route.params.id);
const corrections = ref([]);
const versions = ref([]);
const students = ref([]);
const searchTerm = ref('');
const activeSearch = ref('');
const isLoading = ref(true);
const isSearching = ref(false);
const listError = ref('');
const hasLoadedOptions = ref(false);

const form = reactive({
    versionId: '',
    studentId: '',
    status: 'confirmed',
    notes: ''
});
const versionDetails = ref(null);
const selectedAnswers = reactive({});
const isLoadingQuestions = ref(false);
const isSaving = ref(false);
const formError = ref('');
const formSuccess = ref('');
let questionRequestToken = 0;

const clearAnswers = () => {
    for (const key of Object.keys(selectedAnswers)) delete selectedAnswers[key];
};

const invalidateQuestionRequest = () => {
    questionRequestToken += 1;
    isLoadingQuestions.value = false;
};

const formatScore = (score) => new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
}).format(Number(score || 0));

const statusLabel = (status) => status === 'confirmed' ? 'Confirmada' : 'Pendente';

const loadCorrections = async (search = activeSearch.value) => {
    const requestedApplicationId = applicationId.value;
    const normalizedSearch = search.trim();
    isSearching.value = true;
    listError.value = '';

    try {
        const data = await listCorrections(requestedApplicationId, normalizedSearch);
        if (requestedApplicationId !== applicationId.value) return;
        corrections.value = data;
        activeSearch.value = normalizedSearch;
    } catch (error) {
        if (requestedApplicationId !== applicationId.value) return;
        corrections.value = [];
        listError.value = error.message || 'Não foi possível carregar as correções.';
    } finally {
        if (requestedApplicationId === applicationId.value) isSearching.value = false;
    }
};

const resetForm = () => {
    invalidateQuestionRequest();
    form.versionId = '';
    form.studentId = '';
    form.status = 'confirmed';
    form.notes = '';
    versionDetails.value = null;
    clearAnswers();
};

const loadPage = async () => {
    const requestedApplicationId = applicationId.value;
    isLoading.value = true;
    listError.value = '';
    formError.value = '';
    formSuccess.value = '';
    searchTerm.value = '';
    activeSearch.value = '';
    hasLoadedOptions.value = false;
    resetForm();

    try {
        const [correctionData, optionData] = await Promise.all([
            listCorrections(requestedApplicationId, ''),
            getCorrectionFormOptions(requestedApplicationId)
        ]);
        if (requestedApplicationId !== applicationId.value) return;
        corrections.value = correctionData;
        versions.value = optionData.versions;
        students.value = optionData.students;
        hasLoadedOptions.value = true;
    } catch (error) {
        if (requestedApplicationId !== applicationId.value) return;
        corrections.value = [];
        versions.value = [];
        students.value = [];
        listError.value = error.message || 'Não foi possível carregar as correções.';
    } finally {
        if (requestedApplicationId === applicationId.value) isLoading.value = false;
    }
};

const submitSearch = () => loadCorrections(searchTerm.value);

const clearSearch = async () => {
    searchTerm.value = '';
    await loadCorrections('');
};

const loadQuestions = async () => {
    const requestToken = ++questionRequestToken;
    const versionId = Number(form.versionId);
    const requestedApplicationId = applicationId.value;
    versionDetails.value = null;
    clearAnswers();
    formError.value = '';
    formSuccess.value = '';
    isLoadingQuestions.value = false;

    if (!Number.isSafeInteger(versionId) || versionId < 1) return;

    isLoadingQuestions.value = true;
    try {
        const data = await getVersionQuestions(versionId);
        if (
            requestToken !== questionRequestToken
            ||
            requestedApplicationId !== applicationId.value
            || Number(form.versionId) !== versionId
        ) return;
        versionDetails.value = data;
        for (const question of data.questions) {
            selectedAnswers[question.questionId] = '';
        }
    } catch (error) {
        if (
            requestToken !== questionRequestToken
            || requestedApplicationId !== applicationId.value
        ) return;
        formError.value = error.message || 'Não foi possível carregar a versão.';
    } finally {
        if (
            requestToken === questionRequestToken
            && requestedApplicationId === applicationId.value
        ) isLoadingQuestions.value = false;
    }
};

const submitCorrection = async () => {
    const examVersionId = Number(form.versionId);
    const studentId = Number(form.studentId);
    if (!Number.isSafeInteger(examVersionId) || examVersionId < 1) {
        formError.value = 'Selecione uma versão.';
        return;
    }
    if (!Number.isSafeInteger(studentId) || studentId < 1) {
        formError.value = 'Selecione um aluno.';
        return;
    }
    if (!versionDetails.value?.questions.length) {
        formError.value = 'A versão não possui questões disponíveis.';
        return;
    }

    isSaving.value = true;
    formError.value = '';
    formSuccess.value = '';

    try {
        await createCorrection({
            examVersionId,
            studentId,
            status: form.status,
            notes: form.notes.trim() || null,
            answers: versionDetails.value.questions.map((question) => {
                const selected = selectedAnswers[question.questionId];
                return {
                    questionId: question.questionId,
                    selectedAlternativeId: selected === '' ? null : Number(selected)
                };
            })
        });
        formSuccess.value = 'Correção registrada com sucesso.';
        resetForm();
        await loadCorrections(activeSearch.value);
    } catch (error) {
        formError.value = error.message || 'Não foi possível registrar a correção.';
    } finally {
        isSaving.value = false;
    }
};

watch(applicationId, loadPage, { immediate: true });
</script>

<template>
    <section class="corrections-page">
        <RouterLink
            :to="{ name: 'application-details', params: { id: applicationId } }"
            class="corrections-page__back"
        >
            ← Voltar para a aplicação
        </RouterLink>

        <header class="corrections-page__header">
            <div>
                <p class="eyebrow">Aplicação</p>
                <h1>Correções</h1>
                <p>Consulte as notas e registre respostas usando o gabarito da versão.</p>
            </div>
            <div class="corrections-page__actions">
                <RouterLink
                    :to="{ name: 'application-corrections', params: { id: applicationId } }"
                    class="button button--primary"
                >
                    Corrigir por QR Code
                </RouterLink>
                <RouterLink
                    :to="{
                        name: 'application-unidentified-corrections',
                        params: { id: applicationId }
                    }"
                    class="button button--secondary"
                >
                    Ver correções sem aluno
                </RouterLink>
            </div>
        </header>

        <p v-if="isLoading" role="status">Carregando correções...</p>

        <template v-else>
            <section class="correction-panel correction-panel--form">
                <div class="correction-panel__heading">
                    <div>
                        <p class="eyebrow">Nova correção</p>
                        <h2>Registrar respostas</h2>
                    </div>
                    <p>A nota é calculada automaticamente no servidor.</p>
                </div>

                <form
                    class="correction-form"
                    data-testid="correction-form"
                    @submit.prevent="submitCorrection"
                >
                    <div class="correction-form__controls">
                        <label for="correction-version">
                            Versão
                            <select
                                id="correction-version"
                                v-model="form.versionId"
                                :disabled="isSaving"
                                @change="loadQuestions"
                            >
                                <option value="">Selecione a versão</option>
                                <option
                                    v-for="version in versions"
                                    :key="version.id"
                                    :value="version.id"
                                >
                                    Versão {{ version.versionNumber }}
                                </option>
                            </select>
                        </label>

                        <label for="correction-student">
                            Aluno da turma
                            <select
                                id="correction-student"
                                v-model="form.studentId"
                                :disabled="isSaving"
                            >
                                <option value="">Selecione o aluno</option>
                                <option
                                    v-for="student in students"
                                    :key="student.id"
                                    :value="student.id"
                                >
                                    {{ student.fullName }} — {{ student.registration }}
                                </option>
                            </select>
                        </label>

                        <label for="correction-status">
                            Status
                            <select
                                id="correction-status"
                                v-model="form.status"
                                :disabled="isSaving"
                            >
                                <option value="confirmed">Confirmada</option>
                                <option value="pending">Pendente</option>
                            </select>
                        </label>
                    </div>

                    <p v-if="isLoadingQuestions" role="status">Carregando questões...</p>

                    <div
                        v-else-if="versionDetails"
                        class="correction-questions"
                    >
                        <fieldset
                            v-for="question in versionDetails.questions"
                            :key="question.questionId"
                            class="correction-question"
                        >
                            <legend>
                                <span>Questão {{ question.order }}</span>
                                <small>{{ formatScore(question.score) }} ponto(s)</small>
                            </legend>
                            <p>{{ question.statement }}</p>

                            <div class="correction-question__answers">
                                <label>
                                    <input
                                        v-model="selectedAnswers[question.questionId]"
                                        type="radio"
                                        :name="`question-${question.questionId}`"
                                        value=""
                                        :disabled="isSaving"
                                    />
                                    Em branco
                                </label>
                                <label
                                    v-for="alternative in question.alternatives"
                                    :key="alternative.id"
                                >
                                    <input
                                        v-model="selectedAnswers[question.questionId]"
                                        type="radio"
                                        :name="`question-${question.questionId}`"
                                        :value="alternative.id"
                                        :disabled="isSaving"
                                    />
                                    <span class="correction-question__letter">
                                        {{ String.fromCharCode(64 + alternative.order) }}
                                    </span>
                                    {{ alternative.text }}
                                </label>
                            </div>
                        </fieldset>
                    </div>

                    <label for="correction-notes">
                        Observações
                        <textarea
                            id="correction-notes"
                            v-model="form.notes"
                            maxlength="5000"
                            rows="3"
                            :disabled="isSaving"
                            placeholder="Opcional"
                        ></textarea>
                    </label>

                    <p
                        v-if="formError"
                        class="correction-message correction-message--error"
                        data-testid="correction-form-error"
                        role="alert"
                    >
                        {{ formError }}
                    </p>
                    <p
                        v-if="formSuccess"
                        class="correction-message correction-message--success"
                        role="status"
                    >
                        {{ formSuccess }}
                    </p>

                    <button
                        class="button button--primary"
                        type="submit"
                        :disabled="isSaving || isLoadingQuestions || !versionDetails"
                    >
                        {{ isSaving ? 'Registrando...' : 'Registrar correção' }}
                    </button>
                </form>
            </section>

            <section class="correction-panel">
                <div class="correction-panel__heading correction-panel__heading--list">
                    <div>
                        <p class="eyebrow">Histórico</p>
                        <h2>Correções identificadas</h2>
                    </div>
                    <span v-if="!listError">{{ corrections.length }} registro(s)</span>
                </div>

                <form
                    class="corrections-search"
                    data-testid="correction-search-form"
                    @submit.prevent="submitSearch"
                >
                    <label for="corrections-search" class="sr-only">
                        Buscar por nome ou matrícula
                    </label>
                    <input
                        id="corrections-search"
                        v-model="searchTerm"
                        type="search"
                        maxlength="150"
                        placeholder="Buscar por nome ou matrícula"
                        :disabled="isSearching"
                    />
                    <button class="button button--primary" type="submit" :disabled="isSearching">
                        {{ isSearching ? 'Buscando...' : 'Buscar' }}
                    </button>
                    <button
                        v-if="searchTerm || activeSearch"
                        class="button button--secondary"
                        type="button"
                        :disabled="isSearching"
                        @click="clearSearch"
                    >
                        Limpar
                    </button>
                </form>

                <div
                    v-if="listError"
                    class="corrections-state"
                    data-testid="corrections-error"
                    role="alert"
                >
                    <p>{{ listError }}</p>
                    <button
                        class="button button--secondary"
                        type="button"
                        data-testid="corrections-retry"
                        @click="hasLoadedOptions ? submitSearch() : loadPage()"
                    >
                        Tentar novamente
                    </button>
                </div>

                <p v-else-if="isSearching" class="corrections-state" role="status">
                    Buscando correções...
                </p>

                <div v-else-if="!corrections.length" class="corrections-state" role="status">
                    <h3>Nenhuma correção identificada</h3>
                    <p v-if="activeSearch">Tente buscar por outro nome ou matrícula.</p>
                    <p v-else>Registre uma correção ou verifique as pendências sem aluno.</p>
                </div>

                <div v-else class="corrections-table-wrap">
                    <table class="corrections-table">
                        <thead>
                            <tr>
                                <th>Aluno</th>
                                <th>Versão</th>
                                <th>Respostas</th>
                                <th>Nota</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="correction in corrections" :key="correction.id">
                                <td>
                                    <strong>{{ correction.studentName }}</strong>
                                    <small>{{ correction.registration }}</small>
                                </td>
                                <td>{{ correction.versionNumber }}</td>
                                <td>
                                    {{ correction.answeredCount }}/{{ correction.questionCount }}
                                </td>
                                <td class="corrections-table__score">
                                    {{ formatScore(correction.totalScore) }}
                                </td>
                                <td>
                                    <StatusBadge
                                        :status="correction.status"
                                        :label="statusLabel(correction.status)"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </template>
    </section>
</template>

<style scoped>
.corrections-page {
    display: grid;
    gap: var(--space-8);
}

.corrections-page__back {
    width: fit-content;
    color: var(--color-brand-700);
    font-weight: 700;
}

.corrections-page__header,
.correction-panel__heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-5);
}

.corrections-page__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-3);
}

.corrections-page__header h1,
.correction-panel h2,
.corrections-state h3 {
    margin: 0;
}

.corrections-page__header > div > p:last-child,
.correction-panel__heading > p,
.correction-panel__heading--list > span {
    color: var(--color-muted);
}

.correction-panel {
    display: grid;
    gap: var(--space-5);
    padding: clamp(1.25rem, 4vw, 2rem);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
}

.correction-panel--form {
    border-top: 4px solid var(--color-brand-600);
}

.correction-form,
.correction-questions {
    display: grid;
    gap: var(--space-5);
}

.correction-form__controls {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-4);
}

.correction-form label,
.correction-form__controls label {
    display: grid;
    gap: var(--space-2);
    color: var(--color-heading);
    font-size: 0.9rem;
    font-weight: 700;
}

.correction-form select,
.correction-form textarea,
.corrections-search input {
    width: 100%;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    background: var(--color-surface);
}

.correction-form select,
.corrections-search input {
    min-height: 44px;
    padding: 0 var(--space-3);
}

.correction-form textarea {
    resize: vertical;
    padding: var(--space-3);
}

.correction-form select:focus,
.correction-form textarea:focus,
.corrections-search input:focus {
    border-color: var(--color-brand-500);
    outline: 2px solid var(--color-brand-100);
}

.correction-question {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
    margin: 0;
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-bg);
}

.correction-question legend {
    display: flex;
    width: 100%;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-4);
    color: var(--color-heading);
    font-weight: 750;
}

.correction-question legend small {
    color: var(--color-muted);
    font-weight: 650;
}

.correction-question__answers {
    display: grid;
    gap: var(--space-2);
}

.correction-question__answers label {
    display: flex;
    min-height: 42px;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    cursor: pointer;
    font-weight: 500;
}

.correction-question__letter {
    display: grid;
    width: 26px;
    height: 26px;
    place-items: center;
    border-radius: 50%;
    color: var(--color-brand-800);
    background: var(--color-brand-100);
    font-weight: 800;
}

.correction-message {
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    font-weight: 650;
}

.correction-message--error {
    color: var(--color-danger-text);
    background: var(--color-danger-bg);
}

.correction-message--success {
    color: var(--color-brand-800);
    background: var(--color-brand-50);
}

.correction-form > .button {
    width: fit-content;
}

.corrections-search {
    display: flex;
    gap: var(--space-3);
}

.corrections-search input {
    flex: 1;
}

.corrections-state {
    display: grid;
    min-height: 150px;
    place-items: center;
    align-content: center;
    gap: var(--space-3);
    padding: var(--space-6);
    border-radius: var(--radius-lg);
    color: var(--color-muted);
    background: var(--color-bg);
    text-align: center;
}

.corrections-table-wrap {
    overflow-x: auto;
}

.corrections-table {
    width: 100%;
    border-collapse: collapse;
}

.corrections-table th,
.corrections-table td {
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
    text-align: left;
    white-space: nowrap;
}

.corrections-table th {
    color: var(--color-muted);
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.corrections-table td:first-child {
    display: grid;
    white-space: normal;
}

.corrections-table td small {
    color: var(--color-muted);
}

.corrections-table__score {
    color: var(--color-heading);
    font-size: 1.1rem;
    font-weight: 800;
}

@media (max-width: 760px) {
    .corrections-page__header,
    .correction-panel__heading {
        align-items: flex-start;
        flex-direction: column;
    }

    .correction-form__controls {
        grid-template-columns: 1fr;
    }

    .corrections-search {
        align-items: stretch;
        flex-direction: column;
    }

    .correction-form > .button,
    .corrections-page__actions,
    .corrections-page__actions > .button {
        width: 100%;
    }
}
</style>
