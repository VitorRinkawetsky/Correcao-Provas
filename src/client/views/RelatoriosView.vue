
<template>
    <section class="reports-page app-page">
        <header class="app-page__heading">
            <div>
                <p class="eyebrow">Sistema de Gestão de Provas</p>
                <h1>Relatórios</h1>
                <p class="app-page__lead">Desempenho dos estudantes com correções confirmadas.</p>
            </div>
            <button
                class="button button--secondary"
                :disabled="loading || students.length === 0"
                @click="exportCsv"
            >
                Exportar CSV
            </button>
        </header>

        <section class="filters surface-card">
            <label class="app-field">
                Turma
                <select v-model="filters.classId" @change="onClassChange">
                    <option value="">Todas as turmas</option>
                    <option v-for="item in classes" :key="item.id" :value="String(item.id)">
                        {{ item.name }}
                    </option>
                </select>
            </label>

            <label class="app-field">
                Prova / aplicação
                <select v-model="filters.applicationId">
                    <option value="">Todas as aplicações</option>
                    <option
                        v-for="item in filteredApplications"
                        :key="item.id"
                        :value="String(item.id)"
                    >
                        {{ item.examTitle }} — {{ item.className }}
                    </option>
                </select>
            </label>

            <label class="app-field">
                Data inicial
                <input type="date" v-model="filters.startDate">
            </label>

            <label class="app-field">
                Data final
                <input type="date" v-model="filters.endDate">
            </label>

            <div class="actions">
                <button class="button button--primary" :disabled="loading" @click="loadReport">
                    {{ loading ? 'Carregando...' : 'Aplicar filtros' }}
                </button>
                <button class="button button--secondary" :disabled="loading" @click="clearFilters">
                    Limpar
                </button>
            </div>
        </section>

        <p v-if="errorMessage" class="app-message app-message--error" role="alert">{{ errorMessage }}</p>
        <p v-if="loading">Carregando relatório...</p>

        <template v-else>
            <section class="summary-grid">
                <article class="summary-card">
                    <span>Correções confirmadas</span>
                    <strong>{{ summary.totalCorrections }}</strong>
                </article>
                <article class="summary-card">
                    <span>Média</span>
                    <strong>{{ formatScore(summary.average) }}</strong>
                </article>
                <article class="summary-card">
                    <span>Mediana</span>
                    <strong>{{ formatScore(summary.median) }}</strong>
                </article>
                <article class="summary-card">
                    <span>Maior nota</span>
                    <strong>{{ formatScore(summary.highestScore) }}</strong>
                </article>
                <article class="summary-card">
                    <span>Menor nota</span>
                    <strong>{{ formatScore(summary.lowestScore) }}</strong>
                </article>
            </section>

            <section class="report-section">
                <h2>Distribuição das notas</h2>

                <p v-if="students.length === 0" class="empty">
                    Nenhuma correção confirmada encontrada para os filtros selecionados.
                </p>

                <div v-else class="distribution">
                    <div v-for="item in distribution" :key="item.range" class="distribution-row">
                        <span>{{ item.range }}</span>
                        <div class="bar-track">
                            <div class="bar" :style="{ width: distributionWidth(item.count) }"></div>
                        </div>
                        <strong>{{ item.count }}</strong>
                    </div>
                </div>
            </section>

            <section class="report-section">
                <h2>Notas por estudante</h2>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Estudante</th>
                                <th>Matrícula</th>
                                <th>Turma</th>
                                <th>Prova</th>
                                <th>Nota</th>
                                <th>Confirmação</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="student in students" :key="student.correctionId">
                                <td>{{ student.studentName }}</td>
                                <td>{{ student.registration || '—' }}</td>
                                <td>{{ student.className }}</td>
                                <td>{{ student.examTitle }}</td>
                                <td>{{ formatScore(student.score) }}</td>
                                <td>{{ formatDate(student.confirmedAt) }}</td>
                            </tr>
                            <tr v-if="students.length === 0">
                                <td colspan="6" class="empty">Nenhum resultado para exibir.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </template>
    </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { getReport, getReportFilters } from '../services/reportsApi';

const route = useRoute();

const loading = ref(false);
const errorMessage = ref('');
const classes = ref([]);
const applications = ref([]);
const students = ref([]);
const distribution = ref([]);

const summary = ref({
    totalCorrections: 0,
    average: 0,
    median: 0,
    highestScore: 0,
    lowestScore: 0
});

const filters = reactive({
    classId: '',
    applicationId: '',
    startDate: '',
    endDate: ''
});

const filteredApplications = computed(() => {
    if (!filters.classId) return applications.value;

    return applications.value.filter(
        item => String(item.classId) === String(filters.classId)
    );
});

async function loadFilters() {
    const result = await getReportFilters();
    classes.value = result.classes || [];
    applications.value = result.applications || [];
}

async function loadReport() {
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
        errorMessage.value = 'A data inicial nao pode ser posterior a data final.';
        return;
    }

    loading.value = true;
    errorMessage.value = '';

    try {
        const result = await getReport(filters);
        summary.value = result.summary || summary.value;
        distribution.value = result.distribution || [];
        students.value = result.students || [];
    } catch (error) {
        errorMessage.value = error.message || 'Não foi possível carregar os relatórios.';
    } finally {
        loading.value = false;
    }
}

async function onClassChange() {
    filters.applicationId = '';
    errorMessage.value = '';

    try {
        const result = await getReportFilters(filters.classId);
        applications.value = result.applications || [];
    } catch (error) {
        errorMessage.value = error.message || 'Não foi possível carregar as aplicações.';
    }
}

async function clearFilters() {
    filters.classId = '';
    filters.applicationId = '';
    filters.startDate = '';
    filters.endDate = '';

    try {
        await loadFilters();
        await loadReport();
    } catch (error) {
        errorMessage.value = error.message || 'Não foi possível limpar os filtros.';
    }
}

function formatScore(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString('pt-BR');
}

function distributionWidth(count) {
    const maximum = Math.max(1, ...distribution.value.map(item => Number(item.count || 0)));
    return `${(Number(count || 0) / maximum) * 100}%`;
}

function exportCsv() {
    const headers = [
        'Estudante',
        'Matricula',
        'Turma',
        'Prova',
        'Nota',
        'Data de confirmacao'
    ];

    const escapeCsv = value => `"${String(value ?? '').replace(/"/g, '""')}"`;

    const lines = [
        headers,
        ...students.value.map(student => [
            student.studentName,
            student.registration,
            student.className,
            student.examTitle,
            student.score,
            student.confirmedAt
        ])
    ];

    const csv = '\uFEFF' + lines
        .map(line => line.map(escapeCsv).join(';'))
        .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'relatorio-notas.csv';
    link.click();
    URL.revokeObjectURL(url);
}

onMounted(async () => {
    loading.value = true;

    try {
        await loadFilters();

        // Vindo de "Resultados" da aplicação, já abre filtrado por ela.
        const fromApplication = applications.value.find(
            item => String(item.id) === String(route.query.applicationId)
        );
        if (fromApplication) {
            filters.classId = String(fromApplication.classId);
            filters.applicationId = String(fromApplication.id);
        }

        await loadReport();
    } catch (error) {
        errorMessage.value = error.message || 'Não foi possível carregar os relatórios.';
    } finally {
        loading.value = false;
    }
});
</script>

<style scoped>
.filters {
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: var(--space-4);
}

.actions {
    display: flex;
    align-items: end;
    gap: var(--space-3);
    flex-wrap: wrap;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-4);
}

.summary-card,
.report-section {
    padding: clamp(1.25rem, 3vw, 1.75rem);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
}

.summary-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.summary-card span {
    color: var(--color-muted);
    font-size: 0.82rem;
    font-weight: 700;
}

.summary-card strong {
    color: var(--color-heading);
    font-size: 1.7rem;
}

.report-section h2 {
    margin-bottom: var(--space-5);
    font-size: clamp(1.15rem, 2.4vw, 1.35rem);
}

.distribution {
    display: grid;
    gap: var(--space-3);
}

.distribution-row {
    display: grid;
    grid-template-columns: 65px 1fr 35px;
    gap: var(--space-3);
    align-items: center;
}

.bar-track {
    height: 12px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--color-border-soft);
}

.bar {
    height: 100%;
    border-radius: 999px;
    background: var(--color-brand-600);
    transition: width 0.2s ease;
}

.table-wrapper {
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
}

th,
td {
    padding: 13px 12px;
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
}

th {
    color: var(--color-muted);
    background: var(--color-bg);
    font-size: 0.8rem;
}

.empty {
    padding: var(--space-6);
    color: var(--color-muted);
    text-align: center;
}
</style>
