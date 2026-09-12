<script setup>
import { ArrowRight, CheckCircle2, FileText, Layers3 } from '@lucide/vue';
import { RouterLink } from 'vue-router';

import StatusBadge from '../components/ui/StatusBadge.vue';
import { formatScore, getExamDetails } from '../data/mockData';

const featuredExam = getExamDetails(1);
</script>

<template>
    <section class="home-page">


        <div class="home-hero">
            <div class="home-hero__content">
                <p class="eyebrow">Sistema de Gestão de Provas</p>
                <h1>Página inicial</h1>
                <p class="home-hero__lead">Projeto funcionando!</p>
                <p class="home-hero__description">
                    Consulte a avaliação disponível e visualize sua composição em um ambiente simples e organizado.
                </p>
                <RouterLink to="/provas/1" class="button button--light">
                    Ver detalhes da prova
                    <ArrowRight :size="18" />
                </RouterLink>
            </div>

            <div class="home-hero__visual" aria-hidden="true">
                <span class="home-hero__icon"><FileText :size="34" :stroke-width="1.6" /></span>
                <span class="home-hero__line home-hero__line--long" />
                <span class="home-hero__line" />
                <span class="home-hero__line home-hero__line--short" />
                <span class="home-hero__check"><CheckCircle2 :size="25" /></span>
            </div>
        </div>

                <section class="featured-section" aria-labelledby="aplicacoes-provas">
    <div class="section-heading">
        <div>
            <p class="eyebrow">Gestão de aplicações</p>
            <h2 id="aplicacoes-provas">Telas de aplicações</h2>
        </div>
        <span class="section-heading__icon" aria-hidden="true">
            <Layers3 :size="21" :stroke-width="1.8" />
        </span>
    </div>

    <div class="applications-links">
        <RouterLink to="/aplicacoes" class="exam-preview-card">
            <span class="exam-preview-card__icon" aria-hidden="true">
                <FileText :size="24" :stroke-width="1.7" />
            </span>
            <span class="exam-preview-card__content">
                <span class="exam-preview-card__topline">
                    <strong>Aplicações</strong>
                </span>
                <span>Veja todas as aplicações de prova geradas.</span>
            </span>
            <ArrowRight class="exam-preview-card__arrow" :size="20" aria-hidden="true" />
        </RouterLink>

        <RouterLink to="/aplicacoes/nova" class="exam-preview-card">
            <span class="exam-preview-card__icon" aria-hidden="true">
                <FileText :size="24" :stroke-width="1.7" />
            </span>
            <span class="exam-preview-card__content">
                <span class="exam-preview-card__topline">
                    <strong>Criar aplicação</strong>
                </span>
                <span>Selecione uma prova e uma turma para criar uma nova aplicação.</span>
            </span>
            <ArrowRight class="exam-preview-card__arrow" :size="20" aria-hidden="true" />
        </RouterLink>

        <RouterLink to="/aplicacoes/1" class="exam-preview-card">
            <span class="exam-preview-card__icon" aria-hidden="true">
                <FileText :size="24" :stroke-width="1.7" />
            </span>
            <span class="exam-preview-card__content">
                <span class="exam-preview-card__topline">
                    <strong>Detalhes da aplicação</strong>
                </span>
                <span>Acompanhe turma, status e correções de uma aplicação.</span>
            </span>
            <ArrowRight class="exam-preview-card__arrow" :size="20" aria-hidden="true" />
        </RouterLink>

        <RouterLink to="/aplicacoes/1/gerar" class="exam-preview-card">
            <span class="exam-preview-card__icon" aria-hidden="true">
                <FileText :size="24" :stroke-width="1.7" />
            </span>
            <span class="exam-preview-card__content">
                <span class="exam-preview-card__topline">
                    <strong>Gerar aplicação</strong>
                </span>
                <span>Configure versões, embaralhamento e identificação da prova.</span>
            </span>
            <ArrowRight class="exam-preview-card__arrow" :size="20" aria-hidden="true" />
        </RouterLink>

        <RouterLink to="/aplicacoes/1/versoes" class="exam-preview-card">
            <span class="exam-preview-card__icon" aria-hidden="true">
                <FileText :size="24" :stroke-width="1.7" />
            </span>
            <span class="exam-preview-card__content">
                <span class="exam-preview-card__topline">
                    <strong>Versões geradas</strong>
                </span>
                <span>Baixe ou regenere o PDF das versões da prova.</span>
            </span>
            <ArrowRight class="exam-preview-card__arrow" :size="20" aria-hidden="true" />
        </RouterLink>
    </div>
</section>

        <section v-if="featuredExam" class="featured-section" aria-labelledby="avaliacao-disponivel">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">Acesso rápido</p>
                    <h2 id="avaliacao-disponivel">Avaliação disponível</h2>
                </div>
                <span class="section-heading__icon" aria-hidden="true">
                    <Layers3 :size="21" :stroke-width="1.8" />
                </span>
            </div>

            <RouterLink :to="`/provas/${featuredExam.id}`" class="exam-preview-card">
                <span class="exam-preview-card__icon" aria-hidden="true">
                    <FileText :size="24" :stroke-width="1.7" />
                </span>
                <span class="exam-preview-card__content">
                    <span class="exam-preview-card__topline">
                        <strong>{{ featuredExam.title }}</strong>
                        <StatusBadge :status="featuredExam.status" />
                    </span>
                    <span>{{ featuredExam.description }}</span>
                    <small>
                        {{ featuredExam.questionCount }} questões · {{ formatScore(featuredExam.totalScore) }} pontos
                    </small>
                </span>
                <ArrowRight class="exam-preview-card__arrow" :size="20" aria-hidden="true" />
            </RouterLink>
        </section>
    </section>
</template>
