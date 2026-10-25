
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
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
  <section class="pagina">
    <div class="topo">
      <h1>Aplicações</h1>
      <button class="btn btn-primary" @click="novaAplicacao">
        + Nova aplicação
      </button>
    </div>

    <p v-if="carregando" class="mensagem">
      Carregando aplicações...
    </p>

    <div v-else-if="erro" class="mensagem erro" role="alert">
      <p>{{ erro }}</p>
      <button class="btn btn-secondary" @click="carregarAplicacoes">
        Tentar novamente
      </button>
    </div>

    <p v-else-if="aplicacoes.length === 0" class="mensagem">
      Nenhuma aplicação cadastrada.
    </p>

    <div v-else class="lista">
      <div
        v-for="ap in aplicacoes"
        :key="ap.id"
        class="aplicacao-card"
      >
        <div class="aplicacao-info">
          <p class="aplicacao-titulo">{{ ap.prova }}</p>

          <p class="aplicacao-turma">
            Turma: {{ ap.turma }}
          </p>

          <div class="aplicacao-status">
            <span>Status:</span>
            <StatusBadge :status="ap.status" />
          </div>

          <p class="aplicacao-progresso">
            ID da aplicação: {{ ap.id }}
          </p>
        </div>

        <button
          class="btn btn-secondary"
          @click="abrirAplicacao(ap.id)"
        >
          Abrir
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pagina {
  padding: 24px;
}

.topo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.topo h1 {
  margin: 0;
}

.lista {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.aplicacao-card {
  background: var(--color-surface, #fff);
  border-radius: var(--radius-md, 8px);
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--color-border, #e5e7eb);
}

.aplicacao-info {
  min-width: 0;
}

.aplicacao-titulo {
  font-weight: 600;
  color: var(--color-primary, #0f5e56);
  margin: 0 0 8px;
}

.aplicacao-turma {
  color: var(--color-text-muted, #6b7280);
  font-size: 0.9rem;
  margin: 0 0 8px;
}

.aplicacao-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.9rem;
}

.aplicacao-progresso {
  font-size: 0.9rem;
  margin: 8px 0 0;
  color: var(--color-text-muted, #6b7280);
}

.mensagem {
  padding: 16px 0;
}

.erro {
  color: #b42318;
}

@media (max-width: 600px) {
  .topo {
    align-items: flex-start;
    flex-direction: column;
  }

  .aplicacao-card {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
