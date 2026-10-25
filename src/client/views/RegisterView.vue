<script setup>
import { CheckCircle2, GraduationCap, LockKeyhole, UserPlus } from '@lucide/vue';
import { nextTick, reactive, ref } from 'vue';

import { registerProfessor } from '../services/authApi';

const form = reactive({
    fullName: '',
    email: '',
    password: '',
    passwordConfirmation: ''
});
const errors = ref({});
const submitError = ref('');
const registeredProfessor = ref(null);
const isSaving = ref(false);
const mainContent = ref(null);

const emailLocalPattern = /^[a-z0-9.!#$%&'*+/=?^_{|}~-]+$/i;
const emailDomainLabelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const focusMainContent = () => mainContent.value?.focus();

const isValidEmail = (email) => {
    if (!email || email.length > 254) return false;

    const parts = email.split('@');
    if (parts.length !== 2) return false;

    const [localPart, domain] = parts;
    if (!localPart
        || localPart.length > 64
        || !emailLocalPattern.test(localPart)
        || localPart.startsWith('.')
        || localPart.endsWith('.')
        || localPart.includes('..')) {
        return false;
    }

    const labels = domain.split('.');
    return domain.length <= 253
        && labels.length >= 2
        && labels.every((label) => emailDomainLabelPattern.test(label));
};

const validateForm = () => {
    const nextErrors = {};
    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const passwordLength = Array.from(form.password).length;
    const passwordBytes = new TextEncoder().encode(form.password).length;
    const strongPassword = /[a-z]/.test(form.password)
        && /[A-Z]/.test(form.password)
        && /\d/.test(form.password)
        && /[^A-Za-z0-9]/.test(form.password);

    if (fullName.length < 2 || fullName.length > 150) {
        nextErrors.fullName = 'Informe um nome entre 2 e 150 caracteres.';
    }
    if (!isValidEmail(email)) {
        nextErrors.email = 'Informe um e-mail válido.';
    }
    if (passwordLength < 8 || passwordBytes > 72 || !strongPassword) {
        nextErrors.password = 'A senha precisa conter ao menos 8 caracteres, com maiúscula, minúscula, número e caractere especial, em até 72 bytes.';
    }
    if (form.passwordConfirmation !== form.password) {
        nextErrors.passwordConfirmation = 'As senhas não coincidem.';
    }

    errors.value = nextErrors;
    return Object.keys(nextErrors).length === 0;
};

const focusFirstInvalidField = async () => {
    const fieldIds = {
        fullName: 'full-name',
        email: 'email',
        password: 'password',
        passwordConfirmation: 'password-confirmation'
    };
    const firstInvalidField = Object.keys(errors.value)[0];

    await nextTick();
    mainContent.value
        ?.querySelector(`#${fieldIds[firstInvalidField]}`)
        ?.focus();
};

const applyServerErrors = (error) => {
    const serverErrors = {};

    for (const detail of error.payload?.error?.details || []) {
        if (['fullName', 'email', 'password'].includes(detail.field) && detail.message) {
            serverErrors[detail.field] = detail.message;
        }
    }

    errors.value = { ...errors.value, ...serverErrors };
};

const handleSubmit = async () => {
    if (isSaving.value) return;

    registeredProfessor.value = null;
    submitError.value = '';
    if (!validateForm()) {
        await focusFirstInvalidField();
        return;
    }

    isSaving.value = true;

    try {
        registeredProfessor.value = await registerProfessor({
            fullName: form.fullName.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password
        });
        Object.assign(form, {
            fullName: '',
            email: '',
            password: '',
            passwordConfirmation: ''
        });
        errors.value = {};
    } catch (error) {
        applyServerErrors(error);
        submitError.value = error.message || 'Não foi possível concluir o cadastro.';
    } finally {
        isSaving.value = false;
    }
};
</script>

<template>
    <div class="auth-page">
        <a class="skip-link" href="#cadastro-professor" @click.prevent="focusMainContent">
            Ir para o cadastro
        </a>

        <header class="auth-header">
            <a href="#/" class="brand" aria-label="SGP Católica — página inicial">
                <span class="brand__mark" aria-hidden="true">
                    <GraduationCap :size="25" :stroke-width="1.8" />
                </span>
                <span class="brand__copy">
                    <strong>SGP</strong>
                    <small>Católica SC</small>
                </span>
            </a>
        </header>

        <main id="cadastro-professor" ref="mainContent" class="auth-main" tabindex="-1">
            <section class="auth-panel" aria-labelledby="register-title">
                <aside class="auth-intro">
                    <span class="auth-intro__icon" aria-hidden="true">
                        <LockKeyhole :size="28" :stroke-width="1.8" />
                    </span>
                    <p class="eyebrow">Acesso docente</p>
                    <h1>Organize suas avaliações em um só lugar.</h1>
                    <p>Crie sua conta de professor para preparar provas, gerenciar turmas e acompanhar resultados.</p>
                    <ul>
                        <li><CheckCircle2 :size="18" aria-hidden="true" /> Banco de questões centralizado</li>
                        <li><CheckCircle2 :size="18" aria-hidden="true" /> Turmas e aplicações organizadas</li>
                        <li><CheckCircle2 :size="18" aria-hidden="true" /> Credencial protegida com hash seguro</li>
                    </ul>
                </aside>

                <div class="auth-form-card">
                    <div class="auth-form-card__heading">
                        <span class="auth-form-card__icon" aria-hidden="true">
                            <UserPlus :size="22" :stroke-width="1.8" />
                        </span>
                        <div>
                            <p class="eyebrow">Conta de professor</p>
                            <h2 id="register-title">Crie seu cadastro</h2>
                        </div>
                    </div>

                    <div v-if="registeredProfessor" class="auth-success" role="status">
                        <CheckCircle2 :size="22" aria-hidden="true" />
                        <div>
                            <strong>Cadastro realizado</strong>
                            <p>A conta de {{ registeredProfessor.fullName }} foi criada com sucesso.</p>
                        </div>
                    </div>

                    <form novalidate @submit.prevent="handleSubmit">
                        <label class="auth-field" for="full-name">
                            <span>Nome completo</span>
                            <input
                                id="full-name"
                                v-model="form.fullName"
                                name="fullName"
                                type="text"
                                autocomplete="name"
                                maxlength="150"
                                placeholder="Digite seu nome completo"
                                :disabled="isSaving"
                                :aria-invalid="Boolean(errors.fullName)"
                                aria-describedby="full-name-error"
                            />
                        </label>
                        <p v-if="errors.fullName" id="full-name-error" class="field-error">
                            {{ errors.fullName }}
                        </p>

                        <label class="auth-field" for="email">
                            <span>E-mail</span>
                            <input
                                id="email"
                                v-model="form.email"
                                name="email"
                                type="email"
                                inputmode="email"
                                autocomplete="email"
                                maxlength="254"
                                placeholder="nome@exemplo.com"
                                :disabled="isSaving"
                                :aria-invalid="Boolean(errors.email)"
                                aria-describedby="email-error"
                            />
                        </label>
                        <p v-if="errors.email" id="email-error" class="field-error">
                            {{ errors.email }}
                        </p>

                        <label class="auth-field" for="password">
                            <span>Senha</span>
                            <input
                                id="password"
                                v-model="form.password"
                                name="password"
                                type="password"
                                autocomplete="new-password"
                                minlength="8"
                                placeholder="Crie uma senha forte"
                                :disabled="isSaving"
                                :aria-invalid="Boolean(errors.password)"
                                aria-describedby="password-hint password-error"
                            />
                        </label>
                        <p id="password-hint" class="field-hint">
                            Use maiúscula, minúscula, número e caractere especial.
                        </p>
                        <p v-if="errors.password" id="password-error" class="field-error">
                            {{ errors.password }}
                        </p>

                        <label class="auth-field" for="password-confirmation">
                            <span>Confirmar senha</span>
                            <input
                                id="password-confirmation"
                                v-model="form.passwordConfirmation"
                                name="passwordConfirmation"
                                type="password"
                                autocomplete="new-password"
                                minlength="8"
                                placeholder="Digite a senha novamente"
                                :disabled="isSaving"
                                :aria-invalid="Boolean(errors.passwordConfirmation)"
                                aria-describedby="password-confirmation-error"
                            />
                        </label>
                        <p
                            v-if="errors.passwordConfirmation"
                            id="password-confirmation-error"
                            class="field-error"
                        >
                            {{ errors.passwordConfirmation }}
                        </p>

                        <p v-if="submitError" class="auth-submit-error" role="alert">
                            {{ submitError }}
                        </p>

                        <button class="button button--primary auth-submit" type="submit" :disabled="isSaving">
                            <UserPlus :size="18" aria-hidden="true" />
                            {{ isSaving ? 'Criando conta...' : 'Criar conta' }}
                        </button>
                    </form>

                    <p class="auth-return">Já possui acesso? <a href="#/login">Entrar</a></p>
                </div>
            </section>
        </main>
    </div>
</template>
