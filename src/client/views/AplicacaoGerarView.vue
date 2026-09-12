<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const quantidadeVersoes = ref(3)

function versaoPadrao() {
  return { embaralharQuestoes: true, embaralharAlternativas: true }
}

// mock data (viria da especificação)
const versoes = ref([
  { embaralharQuestoes: true, embaralharAlternativas: true },
  { embaralharQuestoes: true, embaralharAlternativas: false },
  { embaralharQuestoes: true, embaralharAlternativas: true },
])

watch(quantidadeVersoes, (novaBruta) => {
  const nova = Math.max(1, novaBruta || 1)
  quantidadeVersoes.value = nova

  const atual = versoes.value.length
  if (nova > atual) {
    for (let i = atual; i < nova; i++) versoes.value.push(versaoPadrao())
  } else if (nova < atual) {
    versoes.value.splice(nova)
  }
})


const identificacao = ref('com')
const provaGerada = ref(false)

function gerarProva() {
  provaGerada.value = true
}

function verVersoes() {
  router.push({ name: 'application-versions', params: { id: route.params.id } })
}
</script>

<template>
  <section class="pagina">
    <router-link :to="{ name: 'applications' }" class="voltar">← Voltar</router-link>

    <div class="card">
      <h1>Gerar aplicação da prova</h1>

      <div class="campo">
        <label for="qtd-versoes">Quantidade de versões</label>
        <input
          id="qtd-versoes"
          type="number"
          min="1"
          v-model.number="quantidadeVersoes"
          class="input-numero"
        />
      </div>

      <div v-for="(versao, index) in versoes" :key="index" class="versao-bloco">
        <p class="versao-titulo">Versão {{ index + 1 }}</p>
        <label class="checkbox-linha">
          <input type="checkbox" v-model="versao.embaralharQuestoes" />
          Embaralhar questões
        </label>
        <label class="checkbox-linha">
          <input type="checkbox" v-model="versao.embaralharAlternativas" />
          Embaralhar alternativas
        </label>
      </div>

      <div class="campo">
        <p class="versao-titulo">Identificação</p>
        <label class="radio-linha">
          <input type="radio" value="com" v-model="identificacao" />
          Com identificação
        </label>
        <label class="radio-linha">
          <input type="radio" value="sem" v-model="identificacao" />
          Sem identificação
        </label>
      </div>

      <button class="btn btn-primary" @click="gerarProva">Gerar prova</button>

      <div v-if="provaGerada" class="sucesso-bloco">
        <p class="mensagem-sucesso">Prova gerada com sucesso.</p>
        <button class="btn btn-secondary" @click="verVersoes">Ver versões geradas</button>
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
.card {
  background: var(--color-surface, #fff);
  border-radius: var(--radius-md, 8px);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 480px;
}
.campo { display: flex; flex-direction: column; gap: 8px; }
.input-numero {
  width: 80px;
  padding: 8px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-sm, 6px);
}
.versao-bloco {
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-sm, 6px);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.versao-titulo { font-weight: 600; color: var(--color-primary, #0f5e56); }
.checkbox-linha, .radio-linha { display: flex; align-items: center; gap: 8px; }
.sucesso-bloco { display: flex; flex-direction: column; gap: 10px; }
.mensagem-sucesso { color: var(--color-success, #15803d); font-weight: 500; }
</style>
