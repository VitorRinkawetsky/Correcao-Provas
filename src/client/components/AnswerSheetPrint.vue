<script setup>
import { computed } from 'vue';

import { getAnswerSheetGeometry } from '../../shared/answerSheetLayout';

const props = defineProps({
    qrDataUrl: { type: String, required: true },
    examTitle: { type: String, required: true },
    identity: { type: String, required: true },
    versionLabel: { type: String, required: true },
    questions: { type: Array, required: true }
});

const geometry = computed(() => getAnswerSheetGeometry(
    props.questions.map((question) => Number(question.alternativeCount))
));
</script>

<template>
    <div class="answer-sheet-print">
        <svg
            class="answer-sheet"
            :viewBox="`0 0 ${geometry.page.width} ${geometry.page.height}`"
            role="img"
            :aria-label="`Cartão-resposta de ${identity}`"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect width="1000" height="1414" fill="white" />
            <rect
                v-for="(marker, index) in geometry.markers"
                :key="`marker-${index}`"
                class="answer-sheet__marker"
                :x="marker.x"
                :y="marker.y"
                :width="marker.width"
                :height="marker.height"
                fill="black"
            />

            <image
                class="answer-sheet__qr"
                :href="qrDataUrl"
                :x="geometry.qr.x"
                :y="geometry.qr.y"
                :width="geometry.qr.size"
                :height="geometry.qr.size"
                preserveAspectRatio="xMidYMid meet"
            />

            <text x="360" y="145" class="answer-sheet__title">{{ examTitle }}</text>
            <text x="360" y="190" class="answer-sheet__meta">{{ versionLabel }}</text>
            <text x="360" y="230" class="answer-sheet__meta">{{ identity }}</text>
            <text x="360" y="280" class="answer-sheet__instruction">
                Preencha completamente um círculo por questão.
            </text>

            <g
                v-for="(row, rowIndex) in geometry.rows"
                :key="`row-${row.order}`"
                :data-row="row.order"
            >
                <text :x="row.questionNumberX" :y="row.y + 8" class="answer-sheet__number">
                    {{ questions[rowIndex].order }}.
                </text>
                <g
                    v-for="bubble in row.bubbles"
                    :key="bubble.letter"
                    :data-alternative="bubble.letter"
                >
                    <circle
                        class="answer-sheet__bubble"
                        :cx="bubble.x"
                        :cy="bubble.y"
                        :r="bubble.radius"
                        fill="white"
                        stroke="black"
                        stroke-width="3"
                    />
                    <text
                        :x="bubble.x"
                        :y="bubble.y + 7"
                        class="answer-sheet__letter"
                    >{{ bubble.letter }}</text>
                </g>
            </g>

            <text x="500" y="1270" class="answer-sheet__footer">
                Não dobre o cartão e mantenha os quatro quadrados visíveis.
            </text>
        </svg>
    </div>
</template>

<style scoped>
.answer-sheet-print {
    width: min(100%, 210mm);
    margin: 0 auto;
    background: #fff;
}

.answer-sheet {
    display: block;
    width: 100%;
    height: auto;
    border: 1px solid #d1d5db;
    font-family: Arial, sans-serif;
}

.answer-sheet__title { font-size: 30px; font-weight: 700; }
.answer-sheet__meta { font-size: 23px; }
.answer-sheet__instruction { font-size: 18px; }
.answer-sheet__number { font-size: 24px; font-weight: 700; text-anchor: end; }
.answer-sheet__letter { font-size: 20px; font-weight: 700; text-anchor: middle; pointer-events: none; }
.answer-sheet__footer { font-size: 17px; text-anchor: middle; }

@media print {
    .answer-sheet-print {
        width: 210mm;
        height: 297mm;
        margin: 0;
        break-inside: avoid;
    }

    .answer-sheet {
        width: 210mm;
        height: 296.94mm;
        border: 0;
    }
}
</style>
