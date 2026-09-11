<script setup>
import { FileText, GraduationCap, Home, Users } from '@lucide/vue';
import { RouterLink, RouterView } from 'vue-router';
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
                    <RouterLink to="/provas/1" class="main-navigation__link">
                        <FileText :size="18" :stroke-width="1.8" />
                        <span>Detalhes da prova</span>
                    </RouterLink>
                    <RouterLink to="/pages/turmas.html" class="main-navigation__link">
                        <Users :size="18" :stroke-width="1.8" />
                        <span>Turmas</span>
                    </RouterLink>
                </nav>
            </div>
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
