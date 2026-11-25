
<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import { requestJson } from '../services/apiClient'

const route = useRoute()
const router = useRouter()

const quantidadeVersoes = ref(3)

function versaoPadrao() {
  return {
    embaralharQuestoes: true,
    embaralharAlternativas: true,
  }
}

const versoes = ref([
  versaoPadrao(),
  versaoPadrao(),
  versaoPadrao(),
])

// Enquanto o professor digita, o campo pode ficar vazio (ex.: apagar o 3 para digitar 2).
// Só ajusta a lista quando há um número válido; o campo é normalizado ao sair dele.
watch(quantidadeVersoes, (valor) => {
  if (valor === '' || valor === null || !Number.isFinite(Number(valor))) return

  const nova = Math.min(50, Math.max(1, Math.round(Number(valor))))

  while (versoes.value.length < nova) {
    versoes.value.push(versaoPadrao())
  }

  if (versoes.value.length > nova) {
    versoes.value.splice(nova)
  }
})

function normalizarQuantidade() {
  quantidadeVersoes.value = versoes.value.length
}

const identificacao = ref('com')
const provaGerada = ref(false)
const carregando = ref(false)
const erro = ref('')
const versoesGeradas = ref([])

async function gerarProva() {
  carregando.value = true
  erro.value = ''
  provaGerada.value = false
  versoesGeradas.value = []

  try {
    const resultado = await requestJson(
      `/api/application-versions/applications/${route.params.id}/generate`,
      {
        method: 'POST',
        body: JSON.stringify({
          versoes: versoes.value.map((versao) => ({
            embaralharQuestoes: versao.embaralharQuestoes,
            embaralharAlternativas: versao.embaralharAlternativas,
            identificacao: identificacao.value === 'com',
          })),
        }),
      }
    )

    versoesGeradas.value = Array.isArray(resultado)
      ? resultado
      : []

    provaGerada.value = true
  } catch (error) {
    erro.value = error.message || 'Não foi possível gerar as versões.'
  } finally {
    carregando.value = false
  }
}

function verVersoes() {
  router.push({
    name: 'application-versions',
    params: { id: route.params.id },
  })
}
</script>

<template>
  <section class="app-page">
    <router-link :to="{ name: 'applications' }" class="back-link">
      <ArrowLeft :size="16" />
      Voltar para aplicações
    </router-link>

    <header class="app-page__heading">
      <div>
        <p class="eyebrow">Aplicação</p>
        <h1>Gerar versões da prova</h1>
        <p class="app-page__lead">
          Defina quantas versões serão impressas e como cada uma será embaralhada.
        </p>
      </div>
    </header>

    <div class="surface-card formulario">
      <label class="app-field quantidade" for="qtd-versoes">
        Quantidade de versões
        <input
          id="qtd-versoes"
          v-model.number="quantidadeVersoes"
          type="number"
          @blur="normalizarQuantidade"
          min="1"
          max="50"
          :disabled="carregando"
        />
      </label>

      <div class="versoes">
        <div
          v-for="(versao, index) in versoes"
          :key="index"
          class="versao-bloco"
        >
          <h3>Versão {{ index + 1 }}</h3>

          <label class="app-check">
            <input
              v-model="versao.embaralharQuestoes"
              type="checkbox"
              :disabled="carregando"
            />
            Embaralhar questões
          </label>

          <label class="app-check">
            <input
              v-model="versao.embaralharAlternativas"
              type="checkbox"
              :disabled="carregando"
            />
            Embaralhar alternativas
          </label>
        </div>
      </div>

      <section class="secao">
        <h2>Identificação dos alunos</h2>

        <div class="button-row">
          <label class="app-check">
            <input
              v-model="identificacao"
              type="radio"
              value="com"
              :disabled="carregando"
            />
            Com identificação
          </label>

          <label class="app-check">
            <input
              v-model="identificacao"
              type="radio"
              value="sem"
              :disabled="carregando"
            />
            Sem identificação
          </label>
        </div>
      </section>

      <p v-if="erro" class="app-message app-message--error" role="alert">
        {{ erro }}
      </p>

      <div class="button-row">
        <button
          class="button button--primary"
          type="button"
          :disabled="carregando"
          @click="gerarProva"
        >
          {{ carregando ? 'Gerando versões...' : 'Gerar versões' }}
        </button>
      </div>

      <div v-if="provaGerada" class="app-message app-message--success sucesso-bloco">
        <p>
          {{ versoesGeradas.length }} versão(ões) gerada(s) e salva(s) com sucesso.
        </p>

        <ul v-if="versoesGeradas.length">
          <li
            v-for="versao in versoesGeradas"
            :key="versao.id"
          >
            Versão {{ versao.versionNumber }}
          </li>
        </ul>

        <div class="button-row">
          <button
            class="button button--secondary"
            type="button"
            @click="verVersoes"
          >
            Ver versões geradas
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.formulario {
  max-width: 820px;
  gap: var(--space-6);
}

.quantidade {
  max-width: 220px;
}

.secao {
  display: grid;
  gap: var(--space-3);
}

.secao h2 {
  font-size: 1.05rem;
}

.versoes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-3);
}

.versao-bloco {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
}

.versao-bloco h3 {
  color: var(--color-brand-700);
  font-size: 0.95rem;
}

.sucesso-bloco {
  display: grid;
  gap: var(--space-3);
}

.sucesso-bloco ul {
  margin: 0;
  padding-left: var(--space-5);
}
</style>
