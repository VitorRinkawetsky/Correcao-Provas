<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// mock data (viria de dados/mockData.js)
const prova = ref({ nome: 'P1 - Banco de Dados' })
const versoes = ref([
  { rotulo: 'Versão A', alunos: 11 },
  { rotulo: 'Versão B', alunos: 11 },
  { rotulo: 'Versão C', alunos: 10 },
])

function baixarPdf() {
  console.log('Baixar PDF (mock)')
}

function regenerarPdf() {
  console.log('Regenerar PDF (mock)')
}

function voltarDetalhes() {
  router.push({ name: 'application-details', params: { id: route.params.id } })
}
</script>

<template>
  <section class="pagina">
    <button class="voltar" @click="voltarDetalhes">← Voltar aos detalhes</button>

    <div class="card">
      <h1>Prova gerada</h1>
      <p class="subtitle">{{ prova.nome }}</p>
      <p class="versoes-count">{{ versoes.length }} versões</p>

      <ul class="versoes-lista">
        <li v-for="v in versoes" :key="v.rotulo" class="versao-item">
          <span class="versao-rotulo">{{ v.rotulo }}</span>
          <span class="versao-alunos">{{ v.alunos }} alunos</span>
        </li>
      </ul>

      <div class="acoes">
        <button class="btn btn-primary" @click="baixarPdf">Baixar PDF</button>
        <button class="btn btn-secondary" @click="regenerarPdf">Regenerar PDF</button>
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
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 1rem;
}
.card {
  background: var(--color-surface, #fff);
  border-radius: var(--radius-md, 8px);
  padding: 24px;
  max-width: 480px;
}
.subtitle { font-weight: 600; color: var(--color-primary, #0f5e56); margin-bottom: 4px; }
.versoes-count { color: var(--color-text-muted, #6b7280); margin-bottom: 16px; }
.versoes-lista { list-style: none; padding: 0; margin: 0 0 24px; display: flex; flex-direction: column; gap: 8px; }
.versao-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-sm, 6px);
}
.versao-rotulo { font-weight: 500; }
.versao-alunos { color: var(--color-text-muted, #6b7280); }
.acoes { display: flex; gap: 12px; }
</style>
