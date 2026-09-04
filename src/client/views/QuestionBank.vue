<script setup>
import { FileText, Plus, Search, Edit3 } from '@lucide/vue';
import { ref, computed } from 'vue';

const search = ref('');

const questions = [
    {
        id: 1,
        statement: 'A população de determinada cidade cresceu 20% entre 2020 e 2022.',
        discipline: 'Matemática',
        type: 'Múltipla escolha',
        score: 2,
        status: 'Ativa'
    },
    {
        id: 2,
        statement: 'Considere o triângulo ABC abaixo...',
        discipline: 'Matemática',
        type: 'Dissertativa',
        score: 3,
        status: 'Ativa'
    },
    {
        id: 3,
        statement: 'Leia o trecho a seguir e responda:',
        discipline: 'Português',
        type: 'Múltipla escolha',
        score: 1.5,
        status: 'Rascunho'
    },
    {
        id: 4,
        statement: 'Assinale a alternativa correta sobre os períodos...',
        discipline: 'Português',
        type: 'Múltipla escolha',
        score: 1,
        status: 'Ativa'
    },
    {
        id: 5,
        statement: 'Em um laboratório, uma amostra foi aquecida...',
        discipline: 'Ciências',
        type: 'Dissertativa',
        score: 2.5,
        status: 'Arquivada'
    }
];

const filteredQuestions = computed(() => {
    return questions.filter(question =>
        question.statement.toLowerCase().includes(search.value.toLowerCase())
    );
});
</script>

<template>
    <section class="question-bank">

        <header class="header">
            <div>
                <p class="eyebrow">Gerenciamento</p>
                <h1>Banco de questões</h1>
                <p>Gerencie as questões disponíveis para as avaliações.</p>
            </div>

            <button class="button">
                <Plus :size="18" />
                Nova questão
            </button>
        </header>

        <div class="search">
            <Search :size="18" />
            <input
                v-model="search"
                type="text"
                placeholder="Buscar questão..."
            />
        </div>

        <div class="card">

            <div class="table-header">
                <span>Questão</span>
                <span>Disciplina</span>
                <span>Tipo</span>
                <span>Pontuação</span>
                <span>Status</span>
                <span></span>
            </div>

            <div
                v-for="question in filteredQuestions"
                :key="question.id"
                class="question"
            >
                <div class="question-title">
                    <span class="number">
                        {{ String(question.id).padStart(2, '0') }}
                    </span>

                    <div>
                        <strong>{{ question.statement }}</strong>
                        <small>{{ question.discipline }}</small>
                    </div>
                </div>

                <span>{{ question.discipline }}</span>

                <span>{{ question.type }}</span>

                <span>{{ question.score.toFixed(2).replace('.', ',') }} pts</span>

                <span
                    class="status"
                    :class="question.status.toLowerCase()"
                >
                    {{ question.status }}
                </span>

                <button class="edit">
                    <Edit3 :size="17" />
                </button>
            </div>

            <div v-if="filteredQuestions.length === 0" class="empty">
                <FileText :size="28" />
                <p>Nenhuma questão encontrada.</p>
            </div>

        </div>

    </section>
</template>