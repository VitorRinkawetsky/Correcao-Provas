<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StatusBadge from '../components/ui/StatusBadge.vue'


const route = useRoute()
const router = useRouter()

import { aplicacoes } from '../data/aplicacoes'


const aplicacao = computed(() =>
  aplicacoes.find((a) => String(a.id) === String(route.params.id)) || aplicacoes[0]
)

function gerarBaixarPdf() {
  router.push({ name: 'application-versions', params: { id: aplicacao.value.id } })
}
function abrirGabarito() { console.log('Gabarito (mock)') }
function abrirCorrecoes() { console.log('Correções (mock)') }
function abrirResultados() { console.log('Resultados (mock)') }
</script>

<template>
  <section class="pagina">
    <router-link :to="{ name: 'applications' }" class="voltar">← Voltar</router-link>

    <div class="painel">
      <h1>{{ aplicacao.prova }}</h1>

      <div class="info-grid">
        <div class="info-item">
          <span class="info-rotulo">Turma</span>
          <span class="info-valor">{{ aplicacao.turma }}</span>
        </div>
        <div class="info-item">
          <span class="info-rotulo">Status</span>
          <StatusBadge :status="aplicacao.status" />
        </div>
        <div class="info-item">
          <span class="info-rotulo">Alunos</span>
          <span class="info-valor">{{ aplicacao.alunos }}</span>
        </div>
        <div class="info-item">
          <span class="info-rotulo">Corrigidas</span>
          <span class="info-valor">{{ aplicacao.corrigidas }}</span>
        </div>
      </div>

      <div class="acoes">
        <button class="btn btn-primary" @click="gerarBaixarPdf">Gerar / Baixar PDF</button>
        <button class="btn btn-secondary" @click="abrirGabarito">Gabarito</button>
        <button class="btn btn-secondary" @click="abrirCorrecoes">Correções</button>
        <button class="btn btn-secondary" @click="abrirResultados">Resultados</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pagina { padding: 24px; }
.voltar {
  display: inline-block;
  margin-bottom: 16px;
  color: var(--color-primary, #0f5e56);
  text-decoration: none;
}
.painel {
  background: var(--color-surface, #fff);
  border-radius: var(--radius-md, 8px);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.info-item { display: flex; flex-direction: column; gap: 4px; }
.info-rotulo { font-size: 0.85rem; color: var(--color-text-muted, #6b7280); }
.info-valor { font-weight: 600; font-size: 1.1rem; }
.acoes { display: flex; flex-wrap: wrap; gap: 12px; }
</style>
