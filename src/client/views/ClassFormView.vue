<script setup>
import { Save } from '@lucide/vue';
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createClass, getClass, updateClass } from '../services/classApi';

const route = useRoute();
const router = useRouter();
const isEditing = computed(() => Boolean(route.params.id));
const form = reactive({ name: '', subject: '', term: '' });
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const loadedClassId = ref(null);

const loadClass = async () => {
    const id = route.params.id;
    loadedClassId.value = null;
    Object.assign(form, { name: '', subject: '', term: '' });
    errorMessage.value = '';
    isLoading.value = false;
    if (!id) return;
    isLoading.value = true;
    try {
        const data = await getClass(id);
        if (id !== route.params.id) return;
        Object.assign(form, { name: data.name, subject: data.subject, term: data.academicTerm });
        loadedClassId.value = id;
    } catch (error) {
        if (id === route.params.id) errorMessage.value = error.message;
    } finally {
        if (id === route.params.id) isLoading.value = false;
    }
};
watch(() => route.params.id, loadClass, { immediate: true });

const saveClass = async () => {
    if (isSaving.value || isLoading.value || (isEditing.value && !loadedClassId.value)) return;
    const id = route.params.id;
    isSaving.value = true;
    errorMessage.value = '';
    try {
        const data = isEditing.value
            ? await updateClass(route.params.id, form)
            : await createClass(form);
        if (id === route.params.id) await router.push(`/turmas/${data.id}`);
    } catch (error) {
        errorMessage.value = error.message;
    } finally {
        isSaving.value = false;
    }
};
</script>

<template>
    <section class="class-form-page">
        <header class="form-hero">
            <p class="eyebrow">Turma</p>
            <h1>{{ isEditing ? 'Editar turma' : 'Criar turma' }}</h1>
        </header>

        <p v-if="isLoading" role="status">Carregando turma...</p>
        <p v-if="errorMessage" role="alert">{{ errorMessage }}</p>
        <form v-if="!isLoading && (!isEditing || loadedClassId)" class="class-form" @submit.prevent="saveClass">
            <label class="class-form-field">
                <span>Nome</span>
                <input v-model="form.name" type="text" required maxlength="150" :disabled="isSaving" />
            </label>

            <label class="class-form-field">
                <span>Disciplina</span>
                <input v-model="form.subject" type="text" required maxlength="120" :disabled="isSaving" />
            </label>

            <label class="class-form-field">
                <span>Período</span>
                <input v-model="form.term" type="text" required maxlength="20" :disabled="isSaving" />
            </label>

            <div class="form-actions">
                <button class="button button--primary" type="submit" :disabled="isSaving">
                    <Save :size="17" />
                    {{ isSaving ? 'Salvando...' : 'Salvar' }}
                </button>
            </div>
        </form>
    </section>
</template>
