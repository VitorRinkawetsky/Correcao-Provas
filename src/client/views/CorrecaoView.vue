<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    clearCanvas,
    detectQrCode,
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
const video = ref(null);
const previewCanvas = ref(null);
const recognition = ref(null);
const savedScore = ref(null);
let stream;

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
const scanSummary = computed(() => {
    const results = recognition.value?.questions || [];
    return {
        marked: results.filter((result) => ['marked', 'reviewed'].includes(result.status)).length,
        ambiguous: results.filter((result) => result.status === 'ambiguous').length,
        blank: results.filter((result) => result.status === 'blank').length
    };
});
const isCameraSupported = computed(() => Boolean(navigator.mediaDevices?.getUserMedia));

function goToApplication() {
    router.push(applicationId.value
        ? { name: 'application-details', params: { id: applicationId.value } }
        : { name: 'applications' });
}

function goToCorrectionList() {
    router.push({
        name: 'application-corrections-list',
        params: { id: applicationId.value }
    });
}

function goToPendingCorrections() {
    router.push({
        name: 'application-unidentified-corrections',
        params: { id: applicationId.value }
    });
}

function stopScanner() {
    scanning.value = false;
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
    clearRecognition();
}

async function loadContext() {
    const requestedCode = code.value.trim();
    loading.value = true;
    errorMessage.value = '';
    message.value = '';
    try {
        const data = await getCorrectionContext(requestedCode);
        applyContext(data, requestedCode);
        return data;
    } catch (error) {
        errorMessage.value = error.message || 'Código inválido.';
        return null;
    } finally {
        loading.value = false;
    }
}

async function startScanner() {
    errorMessage.value = '';
    message.value = '';
    if (!isCameraSupported.value) {
        errorMessage.value = 'Câmera indisponível. Envie uma foto ou informe o código manualmente.';
        return;
    }
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });
        video.value.srcObject = stream;
        await video.value.play();
        scanning.value = true;
    } catch (error) {
        errorMessage.value = error.name === 'NotAllowedError'
            ? 'Permissão da câmera negada. Envie uma foto ou informe o código manualmente.'
            : 'Câmera indisponível. Envie uma foto ou informe o código manualmente.';
        stopScanner();
    }
}

async function processImageSource(source) {
    processingImage.value = true;
    errorMessage.value = '';
    message.value = '';
    try {
        const imageData = sourceToImageData(source);
        let detectedCode = '';
        try {
            detectedCode = await detectQrCode(source);
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
        code.value = data.qrCodePayload;
        loadedCode.value = data.qrCodePayload;
        studentName.value = data.studentName || '';
        studentRegistration.value = data.studentRegistration || '';
        answers.value = Object.fromEntries(
            data.questions
                .filter((question) => question.selectedAlternativeId)
                .map((question) => [question.questionId, question.selectedAlternativeId])
        );
        savedScore.value = Number(data.totalScore ?? data.questions.reduce(
            (total, question) => total + Number(question.awardedScore || 0),
            0
        ));
        clearRecognition();
    } catch (error) {
        errorMessage.value = error.message || 'Não foi possível carregar a correção.';
    } finally {
        loading.value = false;
    }
}

async function submitCorrection() {
    loading.value = true;
    errorMessage.value = '';
    message.value = '';
    try {
        const payload = {
            ...(!isPersistedCorrection.value ? { qrCodePayload: loadedCode.value } : {}),
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
        savedScore.value = Number(result.totalScore);
        const savedMessage = `Correção salva. Nota: ${result.totalScore}`;
        if (!isPersistedCorrection.value && result.id) {
            await router.push({
                name: 'correction-details',
                params: { correctionId: result.id }
            });
        } else {
            await loadCorrection();
        }
        message.value = savedMessage;
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
        <button class="voltar" @click="goToApplication">
            ← Voltar aos detalhes
        </button>
        <div class="card">
            <h1>Corrigir prova</h1>
            <p class="subtitulo">
                {{ isPersistedCorrection
                    ? 'Revise as respostas e ajuste a correção persistida.'
                    : 'Fotografe o cartão para ler QR e respostas automaticamente.' }}
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
                aria-label="Câmera do cartão-resposta"
                playsinline
                muted
            ></video>
            <div v-if="!isPersistedCorrection" class="acoes">
                <button
                    class="btn btn-primary"
                    type="button"
                    :disabled="scanning || loading || processingImage"
                    @click="startScanner"
                >
                    {{ scanning ? 'Câmera aberta' : 'Ler QR Code / abrir câmera' }}
                </button>
                <button
                    v-if="scanning"
                    class="btn btn-primary"
                    type="button"
                    :disabled="processingImage"
                    @click="captureCard"
                >
                    {{ processingImage ? 'Processando...' : 'Capturar cartão' }}
                </button>
                <button v-if="scanning" class="btn btn-secondary" type="button" @click="stopScanner">
                    Parar câmera
                </button>
                <label class="btn btn-secondary arquivo-botao" :class="{ desabilitado: processingImage }">
                    {{ processingImage ? 'Processando foto...' : 'Enviar foto' }}
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

            <form v-if="!isPersistedCorrection" class="codigo-form" @submit.prevent="loadContext">
                <label for="codigo-prova">Código da prova (alternativa ao leitor de QR)</label>
                <div class="linha">
                    <input id="codigo-prova" v-model="code" required placeholder="Cole o código do QR Code">
                    <button class="btn btn-secondary" :disabled="loading">Buscar</button>
                </div>
            </form>

            <p v-if="errorMessage" class="mensagem erro">{{ errorMessage }}</p>
            <p v-if="message" class="mensagem sucesso">{{ message }}</p>

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

            <form v-if="context" class="correcao-form" @submit.prevent="submitCorrection">
                <div class="resumo">
                    <span>{{ context.examTitle }} · Versão {{ context.versionNumber }}</span>
                    <strong v-if="savedScore != null" class="nota-salva">
                        Nota: {{ Number(savedScore).toFixed(2) }}
                    </strong>
                    <strong v-else>Valor da prova: {{ maxScore.toFixed(2) }}</strong>
                </div>
                <div class="identificacao">
                    <label>
                        Nome do aluno
                        <input v-model="studentName" :readonly="Boolean(context.assignedStudentId)" required>
                    </label>
                    <label>
                        Matrícula
                        <input v-model="studentRegistration" :readonly="Boolean(context.assignedStudentId)" required>
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
                    <p>
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
                    <label v-for="alternative in question.alternatives" :key="alternative.id" class="alternativa">
                        <input
                            v-model="answers[question.questionId]"
                            type="radio"
                            :name="`question-${question.questionId}`"
                            :value="alternative.id"
                            @change="markReviewed(question)"
                        >
                        {{ alternative.text }}
                        <span v-if="isPersistedCorrection && alternative.isCorrect" class="correta">
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
                <button class="btn btn-primary" :disabled="loading || processingImage">
                    {{ isPersistedCorrection ? 'Salvar ajustes' : 'Salvar correção e calcular nota' }}
                </button>
            </form>
        </div>
    </section>
</template>

<style scoped>
.pagina { padding: 24px; }
.voltar { border: 0; background: none; color: var(--color-primary, #0f5e56); cursor: pointer; margin-bottom: 16px; font-size: 1rem; }
.card { background: var(--color-surface, #fff); border-radius: var(--radius-md, 8px); padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.subtitulo { color: var(--color-text-muted, #6b7280); }
.atalhos-correcao { display: flex; flex-wrap: wrap; gap: 12px; }
.camera { width: min(100%, 480px); min-height: 220px; background: #111; border-radius: 8px; object-fit: cover; }
.acoes, .linha { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.arquivo-botao { display: inline-flex; align-items: center; cursor: pointer; }
.arquivo-input { position: absolute; width: 1px; height: 1px; overflow: hidden; opacity: 0; }
.desabilitado { opacity: 0.6; pointer-events: none; }
.privacidade { margin: -6px 0 0; color: var(--color-text-muted, #6b7280); font-size: 0.88rem; }
.codigo-form, .identificacao label { display: flex; flex-direction: column; gap: 6px; }
.codigo-form input, .identificacao input { padding: 10px; border: 1px solid var(--color-border, #e5e7eb); border-radius: 6px; }
.codigo-form { max-width: 640px; }
.linha input { flex: 1; }
.correcao-form { display: flex; flex-direction: column; gap: 18px; }
.identificacao { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.questao { border-top: 1px solid var(--color-border, #e5e7eb); border-left: 4px solid transparent; padding: 14px 0 0 12px; }
.questao--lida { border-left-color: #16a34a; }
.questao--duvida { border-left-color: #eab308; background: #fefce8; }
.alternativa { display: block; padding: 6px 0; }
.resumo { display: flex; justify-content: space-between; gap: 12px; padding: 12px; background: #f3f4f6; border-radius: 6px; }
.pontuacao, .resultado-questao { color: var(--color-text-muted, #6b7280); font-size: 0.9rem; }
.correta { color: #166534; font-weight: 600; }
.nota-salva { color: #166534; font-size: 1.2rem; }
.revisao-leitura { padding: 16px; border: 1px solid var(--color-border, #d8e1df); border-radius: 8px; background: #f8fafc; }
.revisao-cabecalho { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.revisao-cabecalho h2, .revisao-cabecalho p { margin: 0 0 6px; }
.preview-cartao { display: block; width: min(100%, 600px); height: auto; margin: 0 auto; border: 1px solid #cbd5e1; background: white; }
.legenda { display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.86rem; }
.legenda span { display: inline-flex; align-items: center; gap: 5px; }
.legenda-cor { width: 12px; height: 12px; border-radius: 50%; }
.legenda-cor--verde { background: #16a34a; }
.legenda-cor--amarela { background: #eab308; }
.status-leitura { display: inline-block; margin: 0 0 6px; padding: 4px 8px; border-radius: 999px; font-size: 0.82rem; font-weight: 600; }
.status-leitura--marked, .status-leitura--reviewed { color: #166534; background: #dcfce7; }
.status-leitura--ambiguous { color: #854d0e; background: #fef9c3; }
.status-leitura--blank { color: #475569; background: #e2e8f0; }
.mensagem { padding: 10px 12px; border-radius: 6px; }
.erro { color: #b91c1c; background: #fee2e2; }
.sucesso { color: #166534; background: #dcfce7; }
@media (max-width: 640px) {
    .identificacao { grid-template-columns: 1fr; }
    .linha { align-items: stretch; flex-direction: column; }
    .revisao-cabecalho, .resumo { flex-direction: column; }
}
</style>
