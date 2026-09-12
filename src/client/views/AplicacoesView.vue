<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import StatusBadge from '../components/ui/StatusBadge.vue'
import { aplicacoes } from '../data/aplicacoes'



const router = useRouter()


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
      <button class="btn btn-primary" @click="novaAplicacao">+ Nova aplicação</button>
    </div>

    <div class="lista">
      <div v-for="ap in aplicacoes" :key="ap.id" class="aplicacao-card">
        <div class="aplicacao-info">
          <p class="aplicacao-titulo">{{ ap.prova }}</p>
          <p class="aplicacao-turma">Turma: {{ ap.turma }}</p>
          <div class="aplicacao-status">
            <span>Status:</span>
            <StatusBadge :status="ap.status" />
          </div>
          <p class="aplicacao-progresso">{{ ap.corrigidas }} / {{ ap.alunos }} corrigidas</p>
        </div>
        <button class="btn btn-secondary" @click="abrirAplicacao(ap.id)">Abrir</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pagina { padding: 24px; }
.topo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.lista { display: flex; flex-direction: column; gap: 12px; }
.aplicacao-card {
  background: var(--color-surface, #fff);
  border-radius: var(--radius-md, 8px);
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--color-border, #e5e7eb);
}
.aplicacao-titulo { font-weight: 600; color: var(--color-primary, #0f5e56); }
.aplicacao-turma { color: var(--color-text-muted, #6b7280); font-size: 0.9rem; }
.aplicacao-status { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 0.9rem; }
.aplicacao-progresso { font-size: 0.9rem; margin-top: 4px; }
</style>
