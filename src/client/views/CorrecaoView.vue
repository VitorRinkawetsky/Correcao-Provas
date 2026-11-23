
<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    createCorrection,
    getCorrection,
    getCorrectionContext,
    updateCorrection
} from '../services/correctionApi';

const route = useRoute();
const router = useRouter();

const code = ref('');
const context = ref(null);
const answers = ref({});
const studentName = ref('');
const studentRegistration = ref('');
const message = ref('');
const errorMessage = ref('');
const loading = ref(false);
const scanning = ref(false);
const saved = ref(false);
const savedScore = ref(null);
const video = ref(null);

let scanTimer;
let stream;
let detector;

const correctionId = computed(() => route.params.correctionId || null);
const isPersistedCorrection = computed(() => Boolean(correctionId.value));

const applicationId = computed(() => {
    const id = Number(route.params.id || context.value?.applicationId);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
});

const totalScore = computed(() => (
    context.value?.questions?.reduce(
        (total, question) => total + Number(question.awardedScore || 0),
        0
    ) || 0
));

const isCameraSupported = computed(() => (
    typeof window !== 'undefined'
    && 'BarcodeDetector' in window
    && Boolean(navigator.mediaDevices?.getUserMedia)
));

function goToApplication() {
    router.push(applicationId.value
        ? { name: 'application-details', params: { id: applicationId.value } }
        : { name: 'applications' });
}

function goToCorrectionList() {
    if (!applicationId.value) return;

    router.push({
        name: 'application-corrections-list',
        params: { id: applicationId.value }
    });
}

function goToPendingCorrections() {
    if (!applicationId.value) return;

    router.push({
        name: 'application-unidentified-corrections',
        params: { id: applicationId.value }
    });
}

function stopScanner() {
    scanning.value = false;
    clearTimeout(scanTimer);

    stream?.getTracks().forEach((track) => track.stop());
    stream = null;

    if (video.value) {
        video.value.srcObject = null;
    }
}

async function scanFrame() {
    if (!scanning.value || !video.value || !detector) return;

    try {
        const codes = await detector.detect(video.value);

        if (codes[0]?.rawValue) {
            const scannedCode = codes[0].rawValue;
            stopScanner();
            code.value = scannedCode;
            await loadContext();
            return;
        }
    } catch {
        errorMessage.value = 'Não foi possível ler o QR Code. Tente informar o código manualmente.';
        stopScanner();
        return;
    }

    if (scanning.value) {
        scanTimer = setTimeout(scanFrame, 250);
    }
}

async function startScanner() {
    errorMessage.value = '';
    message.value = '';

    if (!isCameraSupported.value) {
        errorMessage.value = 'Leitura pela câmera indisponível neste navegador. Cole o código manualmente.';
        return;
    }

    try {
        detector = new window.BarcodeDetector({ formats: ['qr_code'] });

        stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                facingMode: { ideal: 'environment' }
            }
        });

        if (!video.value) {
            stopScanner();
            return;
        }

        video.value.srcObject = stream;
        await video.value.play();

        scanning.value = true;
        await scanFrame();
    } catch (error) {
        const cameraMessages = {
            NotAllowedError: 'Permissão da câmera negada. Autorize o acesso ou informe o código manualmente.',
            NotFoundError: 'Nenhuma câmera foi encontrada no dispositivo.',
            NotReadableError: 'A câmera está sendo usada por outro aplicativo. Feche-o e tente novamente.',
            OverconstrainedError: 'Não foi possível acessar a câmera solicitada.',
            SecurityError: 'A câmera exige uma conexão segura (HTTPS) ou localhost.'
        };

        errorMessage.value = cameraMessages[error.name]
            || 'Não foi possível acessar a câmera. Informe o código manualmente.';

        stopScanner();
    }
}

async function loadContext() {
    if (!code.value.trim()) {
        errorMessage.value = 'Informe ou leia o código da prova.';
        return;
    }

    loading.value = true;
    errorMessage.value = '';
    message.value = '';
    saved.value = false;
    savedScore.value = null;
    context.value = null;

    try {
        const data = await getCorrectionContext(code.value.trim());

        context.value = data;
        studentName.value = data.assignedStudentName || '';
        studentRegistration.value = data.assignedStudentRegistration || '';
        answers.value = {};
    } catch (error) {
        errorMessage.value = error.message || 'Código inválido ou não encontrado.';
    } finally {
        loading.value = false;
    }
}

async function loadCorrection() {
    loading.value = true;
    errorMessage.value = '';

    try {
        const data = await getCorrection(correctionId.value);

        context.value = data;
        code.value = data.qrCodePayload;
        studentName.value = data.studentName || '';
        studentRegistration.value = data.studentRegistration || '';

        answers.value = Object.fromEntries(
            data.questions
                .filter((question) => question.selectedAlternativeId)
                .map((question) => [
                    question.questionId,
                    question.selectedAlternativeId
                ])
        );

        savedScore.value = data.totalScore ?? null;
    } catch (error) {
        errorMessage.value = error.message || 'Não foi possível carregar a correção.';
    } finally {
        loading.value = false;
    }
}

async function submitCorrection() {
    if (!context.value?.questions?.length) return;

    loading.value = true;
    errorMessage.value = '';
    message.value = '';

    try {
        const payload = {
            ...(!isPersistedCorrection.value ? { qrCodePayload: code.value } : {}),
            studentName: studentName.value,
            studentRegistration: studentRegistration.value,
            notes: context.value?.notes || '',
            answers: context.value.questions.map((question) => ({
                questionId: Number(question.questionId),
                selectedAlternativeId: answers.value[question.questionId] == null
                    ? null
                    : Number(answers.value[question.questionId])
            }))
        };

        const result = isPersistedCorrection.value
            ? await updateCorrection(correctionId.value, payload)
            : await createCorrection(payload);

        savedScore.value = Number(result.totalScore ?? 0);
        saved.value = true;
        message.value = 'Correção salva com sucesso!';

        if (!isPersistedCorrection.value && result.id) {
            await router.push({
                name: 'correction-details',
                params: { correctionId: result.id }
            });
        } else {
            await loadCorrection();
            saved.value = true;
            message.value = 'Correção salva com sucesso!';
        }
    } catch (error) {
        errorMessage.value = error.message || 'Não foi possível salvar a correção.';
    } finally {
        loading.value = false;
    }
}

function answerLetter(question) {
    const index = question.alternatives.findIndex(
        (alternative) => Number(alternative.id)
            === Number(question.selectedAlternativeId)
    );

    return index >= 0 ? String.fromCharCode(65 + index) : 'em branco';
}

async function correctAnotherExam() {
    stopScanner();

    const id = applicationId.value;

    code.value = '';
    context.value = null;
    answers.value = {};
    studentName.value = '';
    studentRegistration.value = '';
    message.value = '';
    errorMessage.value = '';
    saved.value = false;
    savedScore.value = null;

    if (id) {
        await router.push({
            name: 'application-corrections',
            params: { id }
        });
    } else {
        await router.push({ name: 'applications' });
    }
}

onMounted(() => {
    if (isPersistedCorrection.value) {
        loadCorrection();
    }
});

watch(correctionId, (id, previousId) => {
    if (id && id !== previousId) {
        loadCorrection();
    }
});

onBeforeUnmount(stopScanner);
</script>

<template>
    <section class="pagina">
        <button class="voltar" type="button" @click="goToApplication">
            ← Voltar aos detalhes
        </button>

        <div class="card">
            <h1>Corrigir prova</h1>

            <p class="subtitulo">
                {{ isPersistedCorrection
                    ? 'Revise as respostas e ajuste a correção salva.'
                    : 'Leia o QR Code da prova ou informe o código manualmente.' }}
            </p>

            <div v-if="applicationId" class="atalhos-correcao">
                <button class="btn btn-secondary" type="button" @click="goToCorrectionList">
                    Histórico de correções
                </button>

                <button class="btn btn-secondary" type="button" @click="goToPendingCorrections">
                    Correções sem aluno
                </button>
            </div>

            <video
                v-show="scanning"
                ref="video"
                class="camera"
                autoplay
                muted
                playsinline
                aria-label="Leitor de QR Code"
            ></video>

            <div v-if="!isPersistedCorrection" class="acoes">
                <button
                    class="btn btn-primary btn-camera"
                    type="button"
                    :disabled="scanning || loading"
                    @click="startScanner"
                >
                    {{ scanning ? 'Lendo QR Code...' : 'Ler QR Code' }}
                </button>

                <button
                    v-if="scanning"
                    class="btn btn-secondary"
                    type="button"
                    @click="stopScanner"
                >
                    Parar câmera
                </button>
            </div>

            <form
                v-if="!isPersistedCorrection"
                class="codigo-form"
                @submit.prevent="loadContext"
            >
                <label for="codigo-prova">Código da prova</label>

                <div class="linha">
                    <input
                        id="codigo-prova"
                        v-model="code"
                        required
                        placeholder="Cole o código do QR Code"
                        autocomplete="off"
                    >

                    <button class="btn btn-secondary" type="submit" :disabled="loading">
                        Buscar
                    </button>
                </div>
            </form>

            <p v-if="loading" class="mensagem carregando">
                Processando...
            </p>

            <p v-if="errorMessage" class="mensagem erro" role="alert">
                {{ errorMessage }}
            </p>

            <section v-if="saved" class="resultado-salvo" aria-live="polite">
                <p class="resultado-label">Correção finalizada</p>
                <strong class="resultado-nota">
                    Nota: {{ Number(savedScore ?? 0).toFixed(2).replace('.', ',') }}
                </strong>
                <p>{{ message }}</p>

                <button
                    class="btn btn-primary"
                    type="button"
                    @click="correctAnotherExam"
                >
                    Corrigir outra prova
                </button>
            </section>

            <p v-else-if="message" class="mensagem sucesso" role="status">
                {{ message }}
            </p>

            <form
                v-if="context"
                class="correcao-form"
                @submit.prevent="submitCorrection"
            >
                <div class="resumo">
                    <span>
                        {{ context.examTitle }} · Versão {{ context.versionNumber }}
                    </span>

                    <strong>Nota total: {{ totalScore.toFixed(2).replace('.', ',') }}</strong>
                </div>

                <div class="identificacao">
                    <label>
                        Nome do aluno
                        <input
                            v-model="studentName"
                            :readonly="Boolean(context.assignedStudentId)"
                            required
                        >
                    </label>

                    <label>
                        Matrícula
                        <input
                            v-model="studentRegistration"
                            :readonly="Boolean(context.assignedStudentId)"
                            required
                        >
                    </label>
                </div>

                <div
                    v-for="question in context.questions"
                    :key="question.questionId"
                    class="questao"
                >
                    <p class="enunciado">
                        <strong>{{ question.printedOrder }}.</strong>
                        {{ question.statement }}
                        <span class="pontuacao">
                            ({{ Number(question.score || 0).toFixed(2) }} pts)
                        </span>
                    </p>

                    <label
                        v-for="alternative in question.alternatives"
                        :key="alternative.id"
                        class="alternativa"
                    >
                        <input
                            v-model="answers[question.questionId]"
                            type="radio"
                            :name="`question-${question.questionId}`"
                            :value="alternative.id"
                            :disabled="loading"
                        >

                        <span>{{ alternative.text }}</span>

                        <span
                            v-if="isPersistedCorrection && alternative.isCorrect"
                            class="correta"
                        >
                            · correta
                        </span>
                    </label>

                    <p v-if="isPersistedCorrection" class="resultado-questao">
                        Resposta:
                        {{ answerLetter(question) }}
                        · {{ question.isCorrect ? 'correta' : 'incorreta' }}
                        · {{ Number(question.awardedScore || 0).toFixed(2) }} pts
                    </p>
                </div>

                <button
                    class="btn btn-primary btn-salvar"
                    type="submit"
                    :disabled="loading"
                >
                    {{ loading
                        ? 'Salvando...'
                        : isPersistedCorrection
                            ? 'Salvar ajustes'
                            : 'Salvar correção' }}
                </button>
            </form>
        </div>
    </section>
</template>

<style scoped>
.pagina {
    width: 100%;
    max-width: 100%;
    padding: 24px;
    box-sizing: border-box;
    overflow-x: hidden;
}

.voltar {
    border: 0;
    background: none;
    color: var(--color-primary, #0f5e56);
    cursor: pointer;
    margin-bottom: 16px;
    font-size: 1rem;
    min-height: 44px;
}

.card {
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
    box-sizing: border-box;
    background: var(--color-surface, #fff);
    border-radius: var(--radius-md, 8px);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.subtitulo {
    color: var(--color-text-muted, #6b7280);
}

.atalhos-correcao,
.acoes {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.camera {
    display: block;
    width: 100%;
    max-height: 60vh;
    min-height: 180px;
    background: #111;
    border-radius: 8px;
    object-fit: cover;
}

.btn-camera {
    min-height: 48px;
}

.codigo-form,
.identificacao label {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.codigo-form {
    width: 100%;
    max-width: 640px;
}

.codigo-form input,
.identificacao input {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 12px;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 6px;
    font: inherit;
}

.linha {
    display: flex;
    gap: 12px;
    align-items: center;
}

.linha input {
    flex: 1;
}

.correcao-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
}

.identificacao {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.questao {
    min-width: 0;
    border-top: 1px solid var(--color-border, #e5e7eb);
    padding-top: 14px;
}

.enunciado {
    overflow-wrap: anywhere;
}

.alternativa {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 8px;
    cursor: pointer;
    border-radius: 6px;
    overflow-wrap: anywhere;
}

.alternativa input {
    flex: 0 0 auto;
    width: 18px;
    height: 18px;
}

.alternativa:has(input:checked) {
    background: #e8f5f2;
}

.resumo {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    background: #f3f4f6;
    border-radius: 6px;
}

.pontuacao,
.resultado-questao {
    color: var(--color-text-muted, #6b7280);
    font-size: 0.9rem;
}

.correta {
    color: #166534;
    font-weight: 600;
}

.mensagem {
    padding: 10px 12px;
    border-radius: 6px;
}

.erro {
    color: #b91c1c;
    background: #fee2e2;
}

.sucesso {
    color: #166534;
    background: #dcfce7;
}

.carregando {
    color: var(--color-text-muted, #6b7280);
}

.resultado-salvo {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 20px;
    border: 1px solid #b7dfd2;
    border-radius: 10px;
    background: #effaf5;
}

.resultado-label {
    margin: 0;
    font-weight: 600;
    color: #166534;
}

.resultado-nota {
    font-size: 2rem;
    color: #0f5e56;
}

.btn-salvar {
    min-height: 48px;
}

@media (max-width: 640px) {
    .pagina {
        padding: 12px;
        padding-bottom: 90px;
    }

    .card {
        padding: 16px;
        gap: 14px;
    }

    .identificacao {
        grid-template-columns: 1fr;
    }

    .linha {
        align-items: stretch;
        flex-direction: column;
    }

    .linha button {
        width: 100%;
        min-height: 44px;
    }

    .acoes {
        flex-direction: column;
    }

    .acoes button {
        width: 100%;
    }

    .camera {
        width: 100%;
        max-height: 60vh;
        min-height: 200px;
    }

    .resumo {
        flex-direction: column;
    }

    .btn-salvar {
        position: fixed;
        z-index: 20;
        left: 12px;
        right: 12px;
        bottom: 12px;
        width: calc(100% - 24px);
        min-height: 52px;
        box-shadow: 0 2px 12px rgb(0 0 0 / 18%);
    }

    .resultado-salvo .btn {
        width: 100%;
        min-height: 48px;
    }
}
</style>
