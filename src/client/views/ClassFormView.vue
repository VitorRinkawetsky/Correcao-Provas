<script setup>
import { Save } from '@lucide/vue';
import { reactive, ref } from 'vue';

const form = reactive({
    name: 'Engenharia de Software - 4ª fase',
    subject: 'Banco de Dados',
    term: '2026/2'
});

const saveStatus = ref('');

const saveClass = () => {
    saveStatus.value = 'Turma salva nesta sessão';
};
</script>

<template>
    <section class="class-form-page">
        <header class="form-hero">
            <p class="eyebrow">Turma</p>
            <h1>Criar ou editar turma</h1>
        </header>

        <form class="class-form" @submit.prevent="saveClass">
            <label class="class-form-field">
                <span>Nome</span>
                <input v-model="form.name" type="text" />
            </label>

            <label class="class-form-field">
                <span>Disciplina</span>
                <input v-model="form.subject" type="text" />
            </label>

            <label class="class-form-field">
                <span>Período</span>
                <input v-model="form.term" type="text" />
            </label>

            <div class="form-actions">
                <button class="button button--primary" type="submit">
                    <Save :size="17" />
                    Salvar
                </button>
                <p v-if="saveStatus" role="status">{{ saveStatus }}</p>
            </div>
        </form>
    </section>
</template>
