<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft } from '@lucide/vue';
import {
    clearCanvas,
    decodeQrFromImageData,
    detectQrCode,
    quarterTurnsToUpright,
    rotateImageData,
    drawRecognitionPreview,
    loadImageFile,
    sourceToImageData
} from '../services/answerSheetCapture';
import { recognizeAnswerSheet } from '../services/answerSheetReader';
import {
    createCorrection,
    getCorrection,
    getCorrectionContext,
    updateCorrection
} from '../services/correctionApi';

const route = useRoute();
const router = useRouter();

const code = ref('');
const loadedCode = ref('');
const context = ref(null);
const answers = ref({});
const studentName = ref('');
const studentRegistration = ref('');
const message = ref('');
const errorMessage = ref('');
const loading = ref(false);
const processingImage = ref(false);
const scanning = ref(false);
const saved = ref(false);
const savedScore = ref(null);
const video = ref(null);
const previewCanvas = ref(null);
const recognition = ref(null);

let stream;
let detector;
let scanTimer;

const correctionId = computed(() => route.params.correctionId || null);
const isPersistedCorrection = computed(() => Boolean(correctionId.value));
const applicationId = computed(() => {
    const id = Number(route.params.id || context.value?.applicationId);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
});

const maxScore = computed(() => (
    context.value?.questions?.reduce(
        (total, question) => total + Number(question.score || 0),
        0
    ) || 0
));

const totalScore = computed(() => (
    context.value?.questions?.reduce(
        (total, question) => total + Number(question.awardedScore || 0),
        0
    ) || 0
));

const scanSummary = computed(() => {
    const results = recognition.value?.questions || [];
    return {
        marked: results.filter((result) => ['marked', 'reviewed'].includes(result.status)).length,
        ambiguous: results.filter((result) => result.status === 'ambiguous').length,
        blank: results.filter((result) => result.status === 'blank').length
    };
});

const isCameraSupported = computed(() => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.mediaDevices?.getUserMedia)
));

const isQrDetectorSupported = computed(() => (
    typeof window !== 'undefined' && 'BarcodeDetector' in window
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
    if (video.value) video.value.srcObject = null;
}

function clearRecognition() {
    recognition.value = null;
    clearCanvas(previewCanvas.value);
}

function applyContext(data, contextCode) {
    context.value = data;
    loadedCode.value = contextCode;
    code.value = contextCode;
    studentName.value = data.assignedStudentName || '';
    studentRegistration.value = data.assignedStudentRegistration || '';
    answers.value = {};
    savedScore.value = null;
    saved.value = false;
    clearRecognition();
}

async function loadContext() {
    const requestedCode = code.value.trim();
    if (!requestedCode) {
        errorMessage.value = 'Informe ou leia o código da prova.';
        return null;
    }

    loading.value = true;
    errorMessage.value = '';
    message.value = '';
    try {
        const data = await getCorrectionContext(requestedCode);
        applyContext(data, requestedCode);
        return data;
    } catch (error) {
        errorMessage.value = error.message || 'Código inválido ou não encontrado.';
        return null;
    } finally {
        loading.value = false;
    }
}

async function scanFrame() {
    if (!scanning.value || !video.value || !detector) return;

    try {
        const codes = await detector.detect(video.value);
        if (codes[0]?.rawValue) {
            const scannedCode = codes[0].rawValue;
            clearTimeout(scanTimer);
            detector = null;
            code.value = scannedCode;
            await loadContext();
            return;
        }
    } catch {
        // A leitura automática pode falhar em um frame; a captura manual continua disponível.
    }

    if (scanning.value) {
        scanTimer = setTimeout(scanFrame, 250);
    }
}

async function startScanner() {
    errorMessage.value = '';
    message.value = '';

    if (!isCameraSupported.value) {
        errorMessage.value = 'Câmera indisponível neste navegador. Envie uma foto ou informe o código manualmente.';
        return;
    }

    try {
        if (isQrDetectorSupported.value) {
            detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        } else {
            detector = null;
        }

        stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });

        if (!video.value) {
            stopScanner();
            return;
        }

        video.value.srcObject = stream;
        await video.value.play();
        scanning.value = true;

        if (detector) {
            await scanFrame();
        } else {
            message.value = 'Câmera aberta. Capture o cartão para ler o QR Code e as respostas.';
        }
    } catch (error) {
        const cameraMessages = {
            NotAllowedError: 'Permissão da câmera negada. Autorize o acesso ou informe o código manualmente.',
            NotFoundError: 'Nenhuma câmera foi encontrada no dispositivo.',
            NotReadableError: 'A câmera está sendo usada por outro aplicativo. Feche-o e tente novamente.',
            OverconstrainedError: 'Não foi possível acessar a câmera solicitada.',
            SecurityError: 'A câmera exige uma conexão segura (HTTPS) ou localhost.'
        };
        errorMessage.value = cameraMessages[error.name]
            || 'Não foi possível acessar a câmera. Envie uma foto ou informe o código manualmente.';
        stopScanner();
    }
}

async function processImageSource(source) {
    processingImage.value = true;
    errorMessage.value = '';
    message.value = '';

    try {
        let imageData = sourceToImageData(source);
        let detectedCode = '';

        // Lê o QR pelos pixels (funciona em qualquer navegador, inclusive iPhone)
        // e usa a posição dele para deixar o cartão em pé antes de ler as bolinhas.
        const qr = decodeQrFromImageData(imageData);
        if (qr) {
            detectedCode = qr.value;
            imageData = rotateImageData(
                imageData,
                quarterTurnsToUpright(qr.center, imageData.width, imageData.height)
            );
        }

        try {
            if (!detectedCode) detectedCode = await detectQrCode(source, undefined, imageData);
        } catch (error) {
            if (!code.value.trim() && !context.value) throw error;
        }

        const requestedCode = detectedCode || code.value.trim();
        if (!requestedCode) {
            throw new Error('QR Code não encontrado. Informe o código manualmente e refaça a leitura.');
        }

        let targetContext = context.value;
        const contextChanged = !targetContext || requestedCode !== loadedCode.value;
        if (contextChanged) {
            targetContext = await getCorrectionContext(requestedCode);
        }

        const result = recognizeAnswerSheet(imageData, targetContext.questions);
        const nextAnswers = {};

        result.questions.forEach((readResult) => {
            if (readResult.status !== 'marked') return;
            const question = targetContext.questions.find(
                (item) => Number(item.questionId) === Number(readResult.questionId)
            );
            const alternative = question?.alternatives?.[readResult.selectedIndex];
            if (alternative) nextAnswers[question.questionId] = alternative.id;
        });

        if (contextChanged) applyContext(targetContext, requestedCode);
        answers.value = nextAnswers;
        recognition.value = result;
        savedScore.value = null;
        saved.value = false;

        const count = scanSummary.value.marked;
        message.value = `${count} ${count === 1 ? 'resposta lida' : 'respostas lidas'} automaticamente. Revise antes de salvar.`;

        await nextTick();
        drawRecognitionPreview(previewCanvas.value, result);
    } catch (error) {
        errorMessage.value = error.message || 'Não foi possível ler o cartão. Refaça a foto.';
    } finally {
        processingImage.value = false;
    }
}

async function captureCard() {
    if (!video.value) return;
    try {
        await processImageSource(video.value);
    } finally {
        stopScanner();
    }
}

async function handlePhoto(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    let bitmap;
    try {
        bitmap = await loadImageFile(file);
        await processImageSource(bitmap);
    } catch (error) {
        errorMessage.value = error.message || 'Não foi possível abrir a foto.';
    } finally {
        bitmap?.close?.();
        input.value = '';
    }
}

function markReviewed(question) {
    const result = recognition.value?.questions.find(
        (item) => Number(item.questionId) === Number(question.questionId)
    );
    if (!result) return;

    const selectedId = answers.value[question.questionId];
    result.selectedIndex = question.alternatives.findIndex(
        (alternative) => Number(alternative.id) === Number(selectedId)
    );
    result.status = 'reviewed';
    drawRecognitionPreview(previewCanvas.value, recognition.value);
}

function readResult(questionId) {
    return recognition.value?.questions.find(
        (item) => Number(item.questionId) === Number(questionId)
    );
}

function readStatusLabel(questionId) {
    const status = readResult(questionId)?.status;
    return {
        marked: 'Lida automaticamente',
        reviewed: 'Revisada manualmente',
        ambiguous: 'Revisar: marca duvidosa ou rasura',
        blank: 'Lida como em branco'
    }[status] || '';
}

async function loadCorrection() {
    loading.value = true;
    errorMessage.value = '';

    try {
        const data = await getCorrection(correctionId.value);
        context.value = data;
        code.value = data.qrCodePayload || '';
        loadedCode.value = data.qrCodePayload || '';
        studentName.value = data.studentName || '';
        studentRegistration.value = data.studentRegistration || '';
        answers.value = Object.fromEntries(
            data.questions
                .filter((question) => question.selectedAlternativeId != null)
                .map((question) => [question.questionId, question.selectedAlternativeId])
        );
        savedScore.value = Number(data.totalScore ?? data.questions.reduce(
            (total, question) => total + Number(question.awardedScore || 0),
            0
        ));
        saved.value = false;
        clearRecognition();
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
            ...(!isPersistedCorrection.value ? { qrCodePayload: loadedCode.value || code.value } : {}),
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

        savedScore.value = Number(result?.totalScore ?? 0);
        saved.value = true;
        message.value = 'Correção salva com sucesso!';

        if (!isPersistedCorrection.value && result?.id) {
            await router.push({
                name: 'correction-details',
                params: { correctionId: result.id }
            });
        } else if (isPersistedCorrection.value) {
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
        (alternative) => Number(alternative.id) === Number(question.selectedAlternativeId)
    );
    return index >= 0 ? String.fromCharCode(65 + index) : 'em branco';
}

async function correctAnotherExam() {
    stopScanner();
    const id = applicationId.value;

    code.value = '';
    loadedCode.value = '';
    context.value = null;
    answers.value = {};
    studentName.value = '';
    studentRegistration.value = '';
    message.value = '';
    errorMessage.value = '';
    saved.value = false;
    savedScore.value = null;
    clearRecognition();

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
    if (isPersistedCorrection.value) loadCorrection();
});

watch(correctionId, (id, previousId) => {
    if (id && id !== previousId) loadCorrection();
});

onBeforeUnmount(() => {
    stopScanner();
    clearRecognition();
});
</script>

<template>
    <section class="pagina">
        <button class="back-link voltar" type="button" @click="goToApplication">
            <ArrowLeft :size="16" />
            Voltar aos detalhes
        </button>

        <div class="card">
            <div>
                <p class="eyebrow">Correção</p>
                <h1>Corrigir prova</h1>
            </div>
            <p class="subtitulo">
                {{ isPersistedCorrection
                    ? 'Revise as respostas e ajuste a correção salva.'
                    : 'Leia o QR Code ou fotografe o cartão-resposta para preencher as respostas automaticamente.' }}
            </p>

            <div v-if="applicationId" class="atalhos-correcao">
                <button class="button button--secondary" type="button" @click="goToCorrectionList">
                    Histórico de correções
                </button>
                <button class="button button--secondary" type="button" @click="goToPendingCorrections">
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
                aria-label="Câmera do cartão-resposta e leitor de QR Code"
            ></video>

            <div v-if="!isPersistedCorrection" class="acoes">
                <button
                    class="button button--primary btn-camera"
                    type="button"
                    :disabled="scanning || loading || processingImage"
                    @click="startScanner"
                >
                    {{ scanning ? 'Câmera aberta' : 'Ler QR Code / abrir câmera' }}
                </button>

                <button
                    v-if="scanning"
                    class="button button--primary"
                    type="button"
                    :disabled="processingImage"
                    @click="captureCard"
                >
                    {{ processingImage ? 'Processando...' : 'Capturar cartão' }}
                </button>

                <button
                    v-if="scanning"
                    class="button button--secondary"
                    type="button"
                    @click="stopScanner"
                >
                    Parar câmera
                </button>

                <label class="button button--secondary arquivo-botao" :class="{ desabilitado: processingImage }">
                    {{ processingImage ? 'Processando foto...' : 'Enviar foto do cartão' }}
                    <input
                        class="arquivo-input"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        :disabled="processingImage"
                        @change="handlePhoto"
                    >
                </label>
            </div>

            <p v-if="!isPersistedCorrection" class="privacidade">
                A foto é processada somente neste aparelho e não é enviada nem armazenada.
            </p>

            <form
                v-if="!isPersistedCorrection"
                class="codigo-form"
                @submit.prevent="loadContext"
            >
                <label for="codigo-prova">Código da prova (alternativa ao leitor de QR)</label>
                <div class="linha">
                    <input
                        id="codigo-prova"
                        v-model="code"
                        required
                        placeholder="Cole o código do QR Code"
                        autocomplete="off"
                    >
                    <button class="button button--secondary" type="submit" :disabled="loading">
                        Buscar
                    </button>
                </div>
            </form>

            <p v-if="loading" class="mensagem carregando">Processando...</p>
            <p v-if="processingImage" class="mensagem carregando">Lendo cartão-resposta...</p>
            <p v-if="errorMessage" class="mensagem erro" role="alert">{{ errorMessage }}</p>

            <section v-if="recognition" class="revisao-leitura" aria-labelledby="revisao-titulo">
                <div class="revisao-cabecalho">
                    <div>
                        <h2 id="revisao-titulo">Revise a leitura</h2>
                        <p>
                            {{ scanSummary.marked }} marcadas ·
                            {{ scanSummary.blank }} em branco ·
                            {{ scanSummary.ambiguous }} dúvidas
                        </p>
                    </div>
                    <div class="legenda">
                        <span><i class="legenda-cor legenda-cor--verde"></i> lida</span>
                        <span><i class="legenda-cor legenda-cor--amarela"></i> revisar</span>
                    </div>
                </div>
                <canvas
                    ref="previewCanvas"
                    class="preview-cartao"
                    aria-label="Cartão alinhado com marcações detectadas"
                ></canvas>
            </section>

            <section v-if="saved" class="resultado-salvo" aria-live="polite">
                <p class="resultado-label">Correção finalizada</p>
                <strong class="resultado-nota">
                    Nota: {{ Number(savedScore).toFixed(2) }}
                </strong>
                <p>{{ message }}</p>
                <button class="button button--primary" type="button" @click="correctAnotherExam">
                    Corrigir outra prova
                </button>
            </section>

            <p v-else-if="message" class="mensagem sucesso" role="status">{{ message }}</p>

            <form
                v-if="context && !saved"
                class="correcao-form"
                @submit.prevent="submitCorrection"
            >
                <div class="resumo">
                    <span>{{ context.examTitle }} · Versão {{ context.versionNumber }}</span>
                    <strong v-if="isPersistedCorrection && savedScore != null" class="nota-salva">
                        Nota total: {{ Number(savedScore).toFixed(2).replace('.', ',') }}
                    </strong>
                    <strong v-else>Valor da prova: {{ maxScore.toFixed(2).replace('.', ',') }}</strong>
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
                    :class="{
                        'questao--duvida': readResult(question.questionId)?.status === 'ambiguous',
                        'questao--lida': ['marked', 'reviewed'].includes(readResult(question.questionId)?.status)
                    }"
                >
                    <p class="enunciado">
                        <strong>{{ question.printedOrder }}.</strong>
                        {{ question.statement }}
                        <span class="pontuacao">({{ Number(question.score || 0).toFixed(2) }} pts)</span>
                    </p>

                    <p
                        v-if="readStatusLabel(question.questionId)"
                        class="status-leitura"
                        :class="`status-leitura--${readResult(question.questionId).status}`"
                    >
                        {{ readStatusLabel(question.questionId) }}
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
                            @change="markReviewed(question)"
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
                    class="button button--primary btn-salvar"
                    type="submit"
                    :disabled="loading || processingImage"
                >
                    {{ loading
                        ? 'Salvando...'
                        : isPersistedCorrection
                            ? 'Salvar ajustes'
                            : 'Salvar correção e calcular nota' }}
                </button>
            </form>
        </div>
    </section>
</template>

<style scoped>
.pagina {
    display: grid;
    width: 100%;
    max-width: 100%;
    gap: var(--space-5);
    box-sizing: border-box;
    overflow-x: hidden;
}

.voltar {
    min-height: 44px;
    padding: 0;
    background: none;
    cursor: pointer;
}

.card {
    width: 100%;
    max-width: 900px;
    box-sizing: border-box;
    padding: clamp(1.25rem, 4vw, 2.25rem);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
}

.card h1 {
    margin-top: var(--space-2);
}

.subtitulo {
    color: var(--color-muted);
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

.arquivo-botao {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
}

.arquivo-input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    opacity: 0;
}

.desabilitado {
    opacity: 0.6;
    pointer-events: none;
}

.privacidade {
    margin: -6px 0 0;
    color: var(--color-muted);
    font-size: 0.88rem;
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
    min-height: 44px;
    padding: 0 var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font: inherit;
}

.codigo-form input:focus,
.identificacao input:focus {
    border-color: var(--color-brand-500);
    outline: 0;
    box-shadow: 0 0 0 4px rgba(35, 165, 143, 0.14);
}

.codigo-form > label,
.identificacao label {
    color: var(--color-heading);
    font-size: 0.9rem;
    font-weight: 700;
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
    border-left: 4px solid transparent;
    padding: 14px 0 0 12px;
}

.questao--lida {
    border-left-color: #16a34a;
}

.questao--duvida {
    border-left-color: #eab308;
    background: #fefce8;
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
    accent-color: var(--color-brand-700);
}

.alternativa:has(input:checked) {
    background: var(--color-brand-50);
}

.resumo {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 12px;
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg);
    border-radius: var(--radius-md);
}

.pontuacao,
.resultado-questao {
    color: var(--color-muted);
    font-size: 0.9rem;
}

.correta {
    color: #166534;
    font-weight: 600;
}

.nota-salva {
    color: #166534;
    font-size: 1.1rem;
}

.revisao-leitura {
    padding: 16px;
    border: 1px solid var(--color-border, #d8e1df);
    border-radius: 8px;
    background: #f8fafc;
}

.revisao-cabecalho {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
}

.revisao-cabecalho h2,
.revisao-cabecalho p {
    margin: 0 0 6px;
}

.preview-cartao {
    display: block;
    width: min(100%, 600px);
    height: auto;
    margin: 0 auto;
    border: 1px solid #cbd5e1;
    background: white;
}

.legenda {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 0.86rem;
}

.legenda span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.legenda-cor {
    width: 12px;
    height: 12px;
    border-radius: 50%;
}

.legenda-cor--verde {
    background: #16a34a;
}

.legenda-cor--amarela {
    background: #eab308;
}

.status-leitura {
    display: inline-block;
    margin: 0 0 6px;
    padding: 4px 8px;
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 600;
}

.status-leitura--marked,
.status-leitura--reviewed {
    color: #166534;
    background: #dcfce7;
}

.status-leitura--ambiguous {
    color: #854d0e;
    background: #fef9c3;
}

.status-leitura--blank {
    color: #475569;
    background: #e2e8f0;
}

.mensagem {
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
}

.erro {
    color: var(--color-danger-text);
    background: var(--color-danger-bg);
}

.sucesso {
    color: var(--color-brand-800);
    background: var(--color-brand-50);
}

.carregando {
    color: var(--color-muted);
}

.resultado-salvo {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-5);
    border: 1px solid var(--color-brand-100);
    border-radius: var(--radius-lg);
    background: var(--color-brand-50);
}

.resultado-label {
    margin: 0;
    font-weight: 700;
    color: var(--color-brand-800);
}

.resultado-nota {
    font-size: 2rem;
    color: var(--color-brand-700);
}

.btn-salvar {
    min-height: 48px;
}

@media (max-width: 640px) {
    .pagina {
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

    .acoes button,
    .acoes .arquivo-botao {
        width: 100%;
        min-height: 48px;
        justify-content: center;
        box-sizing: border-box;
    }

    .camera {
        width: 100%;
        max-height: 60vh;
        min-height: 200px;
    }

    .resumo,
    .revisao-cabecalho {
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

    .resultado-salvo .button {
        width: 100%;
        min-height: 48px;
    }
}
</style>
