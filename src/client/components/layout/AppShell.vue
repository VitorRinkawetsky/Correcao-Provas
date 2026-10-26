<script setup>
import { BookOpenCheck, GraduationCap, Home, ListChecks, LogOut, Users } from '@lucide/vue';
import { ref } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';

import { useAuthStore } from '../../data/authStore';

const auth = useAuthStore();
const router = useRouter();
const isLoggingOut = ref(false);
const logoutError = ref('');

const handleLogout = async () => {
    if (isLoggingOut.value) return;

    isLoggingOut.value = true;
    logoutError.value = '';
    try {
        await auth.logout();
        await router.replace({ name: 'login' });
    } catch (error) {
        logoutError.value = error.message || 'Não foi possível sair.';
    } finally {
        isLoggingOut.value = false;
    }
};
</script>

<template>
    <div class="site-shell">
        <a class="skip-link" href="#conteudo-principal">Ir para o conteúdo</a>

        <header class="site-header">
            <div class="site-header__inner">
                <RouterLink to="/" class="brand" aria-label="SGP Católica — página inicial">
                    <span class="brand__mark" aria-hidden="true">
                        <GraduationCap :size="25" :stroke-width="1.8" />
                    </span>
                    <span class="brand__copy">
                        <strong>SGP</strong>
                        <small>Católica SC</small>
                    </span>
                </RouterLink>

                <nav class="main-navigation" aria-label="Navegação principal">
                    <RouterLink to="/" class="main-navigation__link">
                        <Home :size="18" :stroke-width="1.8" />
                        <span>Home</span>
                    </RouterLink>
                    <RouterLink to="/provas" class="main-navigation__link">
                        <ListChecks :size="18" :stroke-width="1.8" />
                        <span>Provas</span>
                    </RouterLink>
                    <RouterLink to="/turmas" class="main-navigation__link">
                        <Users :size="18" :stroke-width="1.8" />
                        <span>Turmas</span>
                    </RouterLink>
                    <RouterLink to="/questoes" class="main-navigation__link">
                        <BookOpenCheck :size="18" :stroke-width="1.8" />
                        <span>Banco de questões</span>
                    </RouterLink>
                </nav>

                <div class="teacher-account">
                    <span class="teacher-account__identity">
                        <strong>{{ auth.state.professor?.fullName }}</strong>
                        <small>{{ auth.state.professor?.email }}</small>
                    </span>
                    <button
                        class="teacher-account__logout"
                        type="button"
                        :disabled="isLoggingOut"
                        :aria-label="isLoggingOut ? 'Saindo da conta' : 'Sair da conta'"
                        @click="handleLogout"
                    >
                        <LogOut :size="18" aria-hidden="true" />
                        <span>{{ isLoggingOut ? 'Saindo...' : 'Sair' }}</span>
                    </button>
                </div>
            </div>
            <p v-if="logoutError" class="site-header__error" role="alert">
                {{ logoutError }}
            </p>
        </header>

        <main id="conteudo-principal" class="site-main">
            <RouterView />
        </main>

        <footer class="site-footer">
            <div class="site-footer__inner">
                <span>SGP · Sistema de Gestão de Provas</span>
                <span>Católica SC</span>
            </div>
        </footer>
    </div>
</template>
