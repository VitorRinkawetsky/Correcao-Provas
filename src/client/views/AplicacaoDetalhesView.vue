
<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
  <section class="pagina">
    <router-link :to="{ name: 'applications' }" class="voltar">
      ← Voltar para aplicações
    </router-link>

    <p v-if="carregando">Carregando aplicação...</p>

    <div v-else-if="erro" role="alert">
      <p>{{ erro }}</p>
      <button type="button" @click="carregarAplicacao">
        Tentar novamente
      </button>
    </div>

    <template v-else-if="aplicacao">
      <header class="cabecalho-pagina">
        <div>
          <h1>Detalhes da aplicação</h1>
          <p>{{ aplicacao.examTitle }}</p>
        </div>
        <StatusBadge :status="aplicacao.status" />
      </header>

      <section class="card-detalhes">
        <h2>Informações da aplicação</h2>
        <p><strong>Prova:</strong> {{ aplicacao.examTitle }}</p>
        <p><strong>Turma:</strong> {{ aplicacao.className }}</p>
        <p><strong>ID:</strong> {{ aplicacao.id }}</p>
        <p><strong>Status:</strong> {{ statusLabels[aplicacao.status] || aplicacao.status }}</p>
      </section>

      <section class="acoes-aplicacao">
        <h2>Ações</h2>

        <button type="button" @click="abrirGeracaoVersoes">
          Gerar versões da prova
        </button>

        <button type="button" @click="abrirVersoes">
          Ver versões / baixar PDF
        </button>

        <button type="button" @click="abrirGabarito">
          Gabarito
        </button>

        <button type="button" @click="abrirCorrecoes">
          Corrigir por QR Code
        </button>

        <button type="button" @click="abrirHistoricoCorrecoes">
          Histórico de correções
        </button>

        <button type="button" @click="abrirCorrecoesSemAluno">
          Correções sem aluno
        </button>

        <button type="button" @click="abrirResultados">
          Resultados
        </button>
      </section>
    </template>
  </section>
</template>
