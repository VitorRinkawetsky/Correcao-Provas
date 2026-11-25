
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Plus } from '@lucide/vue'
import StatusBadge from '../components/ui/StatusBadge.vue'
import { requestJson } from '../services/apiClient'

const router = useRouter()

const aplicacoes = ref([])
const carregando = ref(true)
const erro = ref('')

async function carregarAplicacoes() {
  carregando.value = true
  erro.value = ''

  try {
    const dados = await requestJson('/api/applications')

    aplicacoes.value = dados.map((ap) => ({
      ...ap,
      prova: ap.examTitle,
      turma: ap.className,
      alunos: null,
      corrigidas: null
    }))
  } catch (error) {
    erro.value = error.message || 'Não foi possível carregar as aplicações.'
  } finally {
    carregando.value = false
  }
}

onMounted(carregarAplicacoes)

function novaAplicacao() {
  router.push({ name: 'application-create' })
}

function abrirAplicacao(id) {
  router.push({ name: 'application-details', params: { id } })
}
</script>

<template>
  <section class="app-page">
    <header class="app-page__heading">
      <div>
        <p class="eyebrow">Sistema de Gestão de Provas</p>
        <h1>Aplicações</h1>
      </div>
      <button class="button button--primary" type="button" @click="novaAplicacao">
        <Plus :size="18" />
        Nova aplicação
      </button>
    </header>

    <p v-if="carregando" class="empty-state">
      Carregando aplicações...
    </p>

    <div v-else-if="erro" class="app-message app-message--error button-row" role="alert">
      <p>{{ erro }}</p>
      <button class="button button--secondary" type="button" @click="carregarAplicacoes">
        Tentar novamente
      </button>
    </div>

    <p v-else-if="aplicacoes.length === 0" class="empty-state">
      Nenhuma aplicação cadastrada. Use "Nova aplicação" para criar a primeira.
    </p>

    <ul v-else class="exam-list">
      <li
        v-for="ap in aplicacoes"
        :key="ap.id"
        class="exam-list-card"
      >
        <div class="exam-list-card__content">
          <strong>{{ ap.prova }}</strong>
          <span>Turma: {{ ap.turma }}</span>
          <span class="exam-list-card__status">
            Status:
            <StatusBadge :status="ap.status" />
          </span>
        </div>

        <button
          class="button button--secondary"
          type="button"
          @click="abrirAplicacao(ap.id)"
        >
          Abrir
          <ArrowRight :size="17" />
        </button>
      </li>
    </ul>
  </section>
</template>
