<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { proximoId } from '../data/aplicacoes'


const router = useRouter()

// mock data (viria de dados/mockData.js)
const provas = ref(['P1 - Banco de Dados', 'P2 - Estrutura de Dados', 'P1 - Redes'])
const turmas = ref(['Engenharia de Software - 4ª', 'Ciência da Computação - 2ª', 'Sistemas de Informação - 6ª'])

const provaSelecionada = ref(provas.value[0])
const turmaSelecionada = ref(turmas.value[0])

function criarAplicacao() {
  // mock: gera um id novo e segue para a etapa de configuração/geração
  const novoId = proximoId()
  router.push({ name: 'application-generate', params: { id: novoId } })
}
</script>

<template>
  <section class="pagina">
    <router-link :to="{ name: 'applications' }" class="voltar">← Voltar</router-link>

    <div class="card">
      <h1>Criar aplicação</h1>

      <div class="campo">
        <label for="prova">Prova</label>
        <select id="prova" v-model="provaSelecionada">
          <option v-for="p in provas" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>

      <div class="campo">
        <label for="turma">Turma</label>
        <select id="turma" v-model="turmaSelecionada">
          <option v-for="t in turmas" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <button class="btn btn-primary" @click="criarAplicacao">Criar aplicação</button>
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
.card {
  background: var(--color-surface, #fff);
  border-radius: var(--radius-md, 8px);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 420px;
}
.campo { display: flex; flex-direction: column; gap: 6px; }
select {
  padding: 8px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-sm, 6px);
}
</style>
