
<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import StatusBadge from '../components/ui/StatusBadge.vue'
import { statusLabels } from '../data/statusCatalog'
import { getApplication } from '../services/applicationApi'

const route = useRoute()
const router = useRouter()

const aplicacao = ref(null)
const carregando = ref(true)
const erro = ref('')

async function carregarAplicacao() {
  carregando.value = true
  erro.value = ''

  try {
    aplicacao.value = await getApplication(route.params.id)
  } catch (error) {
    aplicacao.value = null
    erro.value = error.message || 'Não foi possível carregar a aplicação.'
  } finally {
    carregando.value = false
  }
}

onMounted(carregarAplicacao)
watch(() => route.params.id, carregarAplicacao)

function abrirGeracaoVersoes() {
  if (!aplicacao.value?.id) return

  router.push({
    name: 'application-generate',
    params: { id: aplicacao.value.id }
  })
}

function abrirVersoes() {
  if (!aplicacao.value?.id) return

  router.push({
    name: 'application-versions',
    params: { id: aplicacao.value.id }
  })
}

function abrirGabarito() {
  abrirVersoes()
}

function abrirCorrecoes() {
  if (!aplicacao.value?.id) return

  router.push({
    name: 'application-corrections',
    params: { id: aplicacao.value.id }
  })
}

function abrirHistoricoCorrecoes() {
  if (!aplicacao.value?.id) return

  router.push({
    name: 'application-corrections-list',
    params: { id: aplicacao.value.id }
  })
}

function abrirCorrecoesSemAluno() {
  if (!aplicacao.value?.id) return

  router.push({
    name: 'application-unidentified-corrections',
    params: { id: aplicacao.value.id }
  })
}

function abrirResultados() {
  if (!aplicacao.value?.id) return

  router.push({
    name: 'reports',
    query: { applicationId: aplicacao.value.id }
  })
}
</script>

<template>
  <section class="app-page">
    <router-link :to="{ name: 'applications' }" class="back-link">
      <ArrowLeft :size="16" />
      Voltar para aplicações
    </router-link>

    <p v-if="carregando" class="empty-state">Carregando aplicação...</p>

    <div v-else-if="erro" class="app-message app-message--error button-row" role="alert">
      <p>{{ erro }}</p>
      <button class="button button--secondary" type="button" @click="carregarAplicacao">
        Tentar novamente
      </button>
    </div>

    <template v-else-if="aplicacao">
      <header class="app-page__heading">
        <div>
          <p class="eyebrow">Aplicação #{{ aplicacao.id }}</p>
          <h1>{{ aplicacao.examTitle }}</h1>
          <p class="app-page__lead">{{ aplicacao.className }}</p>
        </div>
        <StatusBadge :status="aplicacao.status" />
      </header>

      <section class="surface-card">
        <h2>Informações da aplicação</h2>
        <dl class="info-list">
          <div>
            <dt>Prova</dt>
            <dd>{{ aplicacao.examTitle }}</dd>
          </div>
          <div>
            <dt>Turma</dt>
            <dd>{{ aplicacao.className }}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{{ statusLabels[aplicacao.status] || aplicacao.status }}</dd>
          </div>
        </dl>
      </section>

      <section class="surface-card">
        <h2>Ações</h2>

        <div class="button-row">
          <button class="button button--primary" type="button" @click="abrirGeracaoVersoes">
            Gerar versões da prova
          </button>
          <button class="button button--secondary" type="button" @click="abrirVersoes">
            Ver versões / baixar PDF
          </button>
          <button class="button button--secondary" type="button" @click="abrirGabarito">
            Gabarito
          </button>
        </div>

        <div class="button-row">
          <button class="button button--primary" type="button" @click="abrirCorrecoes">
            Corrigir por QR Code
          </button>
          <button class="button button--secondary" type="button" @click="abrirHistoricoCorrecoes">
            Histórico de correções
          </button>
          <button class="button button--secondary" type="button" @click="abrirCorrecoesSemAluno">
            Correções sem aluno
          </button>
          <button class="button button--secondary" type="button" @click="abrirResultados">
            Resultados
          </button>
        </div>
      </section>
    </template>
  </section>
</template>
