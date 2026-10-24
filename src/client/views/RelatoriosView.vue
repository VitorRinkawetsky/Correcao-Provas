
<template>
    <main class="reports-page">
        <header class="page-header">
            <div>
                <h1>Relatórios</h1>
                <p>Desempenho dos estudantes com correções confirmadas.</p>
            </div>
            <button
                class="button primary"
                :disabled="loading || students.length === 0"
                @click="exportCsv"
            >
                Exportar CSV
            </button>
        </header>

        <section class="filters">
            <label>
                Turma
                <select v-model="filters.classId" @change="onClassChange">
                    <option value="">Todas as turmas</option>
                    <option v-for="item in classes" :key="item.id" :value="String(item.id)">
                        {{ item.name }}
                    </option>
                </select>
            </label>

            <label>
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

            <label>
                Data inicial
                <input type="date" v-model="filters.startDate">
            </label>

            <label>
                Data final
                <input type="date" v-model="filters.endDate">
            </label>

            <div class="actions">
                <button class="button primary" :disabled="loading" @click="loadReport">
                    {{ loading ? 'Carregando...' : 'Aplicar filtros' }}
                </button>
                <button class="button secondary" :disabled="loading" @click="clearFilters">
                    Limpar
                </button>
            </div>
        </section>

        <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
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
    </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { getReport, getReportFilters } from '../services/reportsApi';

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
        await loadReport();
    } catch (error) {
        errorMessage.value = error.message || 'Não foi possível carregar os relatórios.';
    } finally {
        loading.value = false;
    }
});
</script>

<style scoped>
.reports-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 28px;
    color: #1f2937;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
}

h1, h2, p {
    margin-top: 0;
}

h1 {
    margin-bottom: 8px;
    font-size: 28px;
}

.page-header p {
    color: #64748b;
    margin-bottom: 0;
}

.filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 16px;
    padding: 20px;
    margin-bottom: 24px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;
}

.filters label {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
}

.filters select, .filters input {
    width: 100%;
    min-height: 40px;
    padding: 8px 10px;
    border: 1px solid #cbd5e1;
    border-radius: 7px;
    background: #fff;
    font: inherit;
}

.actions {
    display: flex;
    align-items: end;
    gap: 8px;
    flex-wrap: wrap;
}

.button {
    min-height: 40px;
    padding: 9px 14px;
    border: 0;
    border-radius: 7px;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
}

.button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.primary {
    color: #fff;
    background: #2563eb;
}

.secondary {
    color: #334155;
    background: #e2e8f0;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.summary-card, .report-section {
    padding: 20px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;
}

.summary-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.summary-card span {
    color: #64748b;
    font-size: 13px;
}

.summary-card strong {
    font-size: 26px;
}

.report-section {
    margin-bottom: 24px;
}

.report-section h2 {
    margin-bottom: 20px;
    font-size: 19px;
}

.distribution {
    display: grid;
    gap: 14px;
}

.distribution-row {
    display: grid;
    grid-template-columns: 65px 1fr 35px;
    gap: 12px;
    align-items: center;
}

.bar-track {
    height: 13px;
    overflow: hidden;
    border-radius: 20px;
    background: #e2e8f0;
}

.bar {
    height: 100%;
    border-radius: 20px;
    background: #2563eb;
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

th, td {
    padding: 13px 12px;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
}

th {
    color: #475569;
    background: #f8fafc;
    font-size: 13px;
}

.error {
    padding: 14px;
    border-radius: 8px;
    color: #991b1b;
    background: #fee2e2;
}

.empty {
    padding: 24px;
    color: #64748b;
    text-align: center;
}

@media (max-width: 600px) {
    .reports-page {
        padding: 16px;
    }

    .page-header {
        align-items: flex-start;
        flex-direction: column;
    }
}
</style>
