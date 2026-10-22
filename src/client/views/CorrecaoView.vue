<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createCorrection, getCorrectionContext } from '../services/correctionApi';

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
const video = ref(null);
let scanTimer;
let stream;

const isCameraSupported = computed(() => (
    'BarcodeDetector' in window
    && !!navigator.mediaDevices?.getUserMedia
));

function stopScanner() {
    scanning.value = false;
    clearTimeout(scanTimer);
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    if (video.value) video.value.srcObject = null;
}

async function scanFrame() {
    if (!scanning.value || !video.value) return;
    try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const codes = await detector.detect(video.value);
        if (codes[0]?.rawValue) {
            stopScanner();
            code.value = codes[0].rawValue;
            await loadContext();
            return;
        }
    } catch {
        errorMessage.value = 'Nao foi possivel ler o QR Code pela camera.';
        stopScanner();
        return;
    }
    scanTimer = setTimeout(scanFrame, 250);
}

async function startScanner() {
    errorMessage.value = '';
    message.value = '';
    if (!isCameraSupported.value) {
        errorMessage.value = 'Camera ou leitor de QR Code indisponivel. Informe o codigo manualmente.';
        return;
    }
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        video.value.srcObject = stream;
        await video.value.play();
        scanning.value = true;
        await scanFrame();
    } catch (error) {
        errorMessage.value = error.name === 'NotAllowedError'
            ? 'Permissao da camera negada. Informe o codigo manualmente.'
            : 'Camera indisponivel. Informe o codigo manualmente.';
        stopScanner();
    }
}

async function loadContext() {
    loading.value = true;
    errorMessage.value = '';
    message.value = '';
    context.value = null;
    try {
        const data = await getCorrectionContext(code.value);
        context.value = data;
        studentName.value = data.assignedStudentName || '';
        studentRegistration.value = data.assignedStudentRegistration || '';
        answers.value = {};
    } catch (error) {
        errorMessage.value = error.message || 'Codigo invalido.';
    } finally {
        loading.value = false;
    }
}

async function submitCorrection() {
    loading.value = true;
    errorMessage.value = '';
    message.value = '';
    try {
        const result = await createCorrection({
            qrCodePayload: code.value,
            studentName: studentName.value,
            studentRegistration: studentRegistration.value,
            answers: Object.entries(answers.value).map(([questionId, selectedAlternativeId]) => ({
                questionId: Number(questionId),
                selectedAlternativeId: Number(selectedAlternativeId)
            }))
        });
        message.value = `Correcao salva. Nota: ${result.totalScore}`;
    } catch (error) {
        errorMessage.value = error.message || 'Nao foi possivel salvar a correcao.';
    } finally {
        loading.value = false;
    }
}

onBeforeUnmount(stopScanner);
</script>

<template>
    <section class="pagina">
        <button class="voltar" @click="router.push({ name: 'application-details', params: { id: route.params.id } })">
            ← Voltar aos detalhes
        </button>
        <div class="card">
            <h1>Corrigir prova</h1>
            <p class="subtitulo">Leia o QR Code da prova ou informe o codigo manualmente.</p>

            <video v-show="scanning" ref="video" class="camera" aria-label="Leitor de QR Code"></video>
            <div class="acoes">
                <button class="btn btn-primary" :disabled="scanning || loading" @click="startScanner">
                    {{ scanning ? 'Lendo QR Code...' : 'Ler QR Code' }}
                </button>
                <button v-if="scanning" class="btn btn-secondary" @click="stopScanner">Parar camera</button>
            </div>

            <form class="codigo-form" @submit.prevent="loadContext">
                <label for="codigo-prova">Codigo da prova</label>
                <div class="linha">
                    <input id="codigo-prova" v-model="code" required placeholder="Cole o codigo do QR Code">
                    <button class="btn btn-secondary" :disabled="loading">Buscar</button>
                </div>
            </form>

            <p v-if="errorMessage" class="mensagem erro">{{ errorMessage }}</p>
            <p v-if="message" class="mensagem sucesso">{{ message }}</p>

            <form v-if="context" class="correcao-form" @submit.prevent="submitCorrection">
                <div class="identificacao">
                    <label>
                        Nome do aluno
                        <input v-model="studentName" :readonly="Boolean(context.assignedStudentId)" required>
                    </label>
                    <label>
                        Matricula
                        <input v-model="studentRegistration" :readonly="Boolean(context.assignedStudentId)" required>
                    </label>
                </div>
                <div v-for="question in context.questions" :key="question.questionId" class="questao">
                    <p><strong>{{ question.printedOrder }}.</strong> {{ question.statement }}</p>
                    <label v-for="alternative in question.alternatives" :key="alternative.id" class="alternativa">
                        <input
                            v-model="answers[question.questionId]"
                            type="radio"
                            :name="`question-${question.questionId}`"
                            :value="alternative.id"
                        >
                        {{ alternative.text }}
                    </label>
                </div>
                <button class="btn btn-primary" :disabled="loading">Salvar correcao</button>
            </form>
        </div>
    </section>
</template>

<style scoped>
.pagina { padding: 24px; }
.voltar { border: 0; background: none; color: var(--color-primary, #0f5e56); cursor: pointer; margin-bottom: 16px; font-size: 1rem; }
.card { background: var(--color-surface, #fff); border-radius: var(--radius-md, 8px); padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.subtitulo { color: var(--color-text-muted, #6b7280); }
.camera { width: min(100%, 480px); min-height: 220px; background: #111; border-radius: 8px; object-fit: cover; }
.acoes, .linha { display: flex; gap: 12px; align-items: center; }
.codigo-form, .identificacao label { display: flex; flex-direction: column; gap: 6px; }
.codigo-form input, .identificacao input { padding: 10px; border: 1px solid var(--color-border, #e5e7eb); border-radius: 6px; }
.codigo-form { max-width: 640px; }
.linha input { flex: 1; }
.correcao-form { display: flex; flex-direction: column; gap: 18px; }
.identificacao { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.questao { border-top: 1px solid var(--color-border, #e5e7eb); padding-top: 14px; }
.alternativa { display: block; padding: 6px 0; }
.mensagem { padding: 10px 12px; border-radius: 6px; }
.erro { color: #b91c1c; background: #fee2e2; }
.sucesso { color: #166534; background: #dcfce7; }
@media (max-width: 640px) {
    .identificacao { grid-template-columns: 1fr; }
    .linha { align-items: stretch; flex-direction: column; }
}
</style>
