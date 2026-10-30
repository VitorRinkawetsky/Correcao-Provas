<script setup>
import { CheckCircle2, GraduationCap, LogIn, ShieldCheck } from '@lucide/vue';
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '../data/authStore';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const form = reactive({ email: '', password: '' });
const errors = ref({});
const submitError = ref('');
const isLoading = ref(false);
const mainContent = ref(null);

const focusMainContent = () => mainContent.value?.focus();

const validateForm = () => {
    const nextErrors = {};
    const email = form.email.trim();

    if (!email || !email.includes('@') || email.length > 254) {
        nextErrors.email = 'Informe um e-mail válido.';
    }
    if (!form.password) {
        nextErrors.password = 'Informe sua senha.';
    }

    errors.value = nextErrors;
    return Object.keys(nextErrors).length === 0;
};

const safeRedirect = () => {
    const redirect = route.query.redirect;
    return typeof redirect === 'string'
        && redirect.startsWith('/')
        && !redirect.startsWith('//')
        ? redirect
        : '/';
};

const handleSubmit = async () => {
    if (isLoading.value) return;

    submitError.value = '';
    if (!validateForm()) return;

    isLoading.value = true;
    try {
        await auth.login({
            email: form.email.trim().toLowerCase(),
            password: form.password
        });
        await router.replace(safeRedirect());
    } catch (error) {
        form.password = '';
        submitError.value = error.message || 'Não foi possível entrar.';
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <div class="auth-page">
        <a class="skip-link" href="#login-professor" @click.prevent="focusMainContent">
            Ir para o login
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

        <main id="login-professor" ref="mainContent" class="auth-main" tabindex="-1">
            <section class="auth-panel" aria-labelledby="login-title">
                <aside class="auth-intro">
                    <span class="auth-intro__icon" aria-hidden="true">
                        <ShieldCheck :size="28" :stroke-width="1.8" />
                    </span>
                    <p class="eyebrow">Acesso docente</p>
                    <h1>Bem-vindo de volta.</h1>
                    <p>Entre com sua conta de professor para continuar organizando suas avaliações.</p>
                    <ul>
                        <li><CheckCircle2 :size="18" aria-hidden="true" /> Sessão protegida no navegador</li>
                        <li><CheckCircle2 :size="18" aria-hidden="true" /> Acesso exclusivo para professores</li>
                        <li><CheckCircle2 :size="18" aria-hidden="true" /> Seus dados permanecem vinculados à sua conta</li>
                    </ul>
                </aside>

                <div class="auth-form-card">
                    <div class="auth-form-card__heading">
                        <span class="auth-form-card__icon" aria-hidden="true">
                            <LogIn :size="22" :stroke-width="1.8" />
                        </span>
                        <div>
                            <p class="eyebrow">Conta de professor</p>
                            <h2 id="login-title">Entre no SGP</h2>
                        </div>
                    </div>

                    <form novalidate @submit.prevent="handleSubmit">
                        <label class="auth-field" for="login-email">
                            <span>E-mail</span>
                            <input
                                id="login-email"
                                v-model="form.email"
                                name="email"
                                type="email"
                                inputmode="email"
                                autocomplete="email"
                                maxlength="254"
                                placeholder="nome@exemplo.com"
                                :disabled="isLoading"
                                :aria-invalid="Boolean(errors.email)"
                                aria-describedby="login-email-error"
                            />
                        </label>
                        <p v-if="errors.email" id="login-email-error" class="field-error">
                            {{ errors.email }}
                        </p>

                        <label class="auth-field" for="login-password">
                            <span>Senha</span>
                            <input
                                id="login-password"
                                v-model="form.password"
                                name="password"
                                type="password"
                                autocomplete="current-password"
                                placeholder="Digite sua senha"
                                :disabled="isLoading"
                                :aria-invalid="Boolean(errors.password)"
                                aria-describedby="login-password-error"
                            />
                        </label>
                        <p v-if="errors.password" id="login-password-error" class="field-error">
                            {{ errors.password }}
                        </p>

                        <p v-if="submitError" class="auth-submit-error" role="alert">
                            {{ submitError }}
                        </p>

                        <button class="button button--primary auth-submit" type="submit" :disabled="isLoading">
                            <LogIn :size="18" aria-hidden="true" />
                            {{ isLoading ? 'Entrando...' : 'Entrar' }}
                        </button>
                    </form>

                    <p class="auth-return">Ainda não possui acesso? <a href="#/cadastro">Criar conta de professor</a></p>
                </div>
            </section>
        </main>
    </div>
</template>
