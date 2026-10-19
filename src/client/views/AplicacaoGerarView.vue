
<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

watch(quantidadeVersoes, (novaBruta) => {
  const nova = Math.min(50, Math.max(1, Number(novaBruta) || 1))
  quantidadeVersoes.value = nova

  const atual = versoes.value.length

  if (nova > atual) {
    for (let i = atual; i < nova; i++) {
      versoes.value.push(versaoPadrao())
    }
  } else if (nova < atual) {
    versoes.value.splice(nova)
  }
})

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
  <section class="pagina">
    <router-link
      :to="{ name: 'applications' }"
      class="voltar"
    >
      ← Voltar
    </router-link>

    <div class="card">
      <h1>Gerar aplicação da prova</h1>

      <div class="campo">
        <label for="qtd-versoes">Quantidade de versões</label>

        <input
          id="qtd-versoes"
          v-model.number="quantidadeVersoes"
          type="number"
          min="1"
          max="50"
          class="input-numero"
          :disabled="carregando"
        />
      </div>

      <div
        v-for="(versao, index) in versoes"
        :key="index"
        class="versao-bloco"
      >
        <p class="versao-titulo">
          Versão {{ index + 1 }}
        </p>

        <label class="checkbox-linha">
          <input
            v-model="versao.embaralharQuestoes"
            type="checkbox"
            :disabled="carregando"
          />
          Embaralhar questões
        </label>

        <label class="checkbox-linha">
          <input
            v-model="versao.embaralharAlternativas"
            type="checkbox"
            :disabled="carregando"
          />
          Embaralhar alternativas
        </label>
      </div>

      <div class="campo">
        <p class="versao-titulo">Identificação</p>

        <label class="radio-linha">
          <input
            v-model="identificacao"
            type="radio"
            value="com"
            :disabled="carregando"
          />
          Com identificação
        </label>

        <label class="radio-linha">
          <input
            v-model="identificacao"
            type="radio"
            value="sem"
            :disabled="carregando"
          />
          Sem identificação
        </label>
      </div>

      <p v-if="erro" class="mensagem-erro" role="alert">
        {{ erro }}
      </p>

      <button
        class="btn btn-primary"
        :disabled="carregando"
        @click="gerarProva"
      >
        {{ carregando ? 'Gerando versões...' : 'Gerar prova' }}
      </button>

      <div v-if="provaGerada" class="sucesso-bloco">
        <p class="mensagem-sucesso">
          {{ versoesGeradas.length }} versão(ões) gerada(s) e salva(s) com sucesso.
        </p>

        <ul v-if="versoesGeradas.length">
          <li
            v-for="versao in versoesGeradas"
            :key="versao.id"
          >
            Versão {{ versao.versionNumber }} — ID {{ versao.id }}
          </li>
        </ul>

        <button
          class="btn btn-secondary"
          @click="verVersoes"
        >
          Ver versões geradas
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pagina {
  padding: 24px;
}

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

.campo {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

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

.versao-titulo {
  font-weight: 600;
  color: var(--color-primary, #0f5e56);
}

.checkbox-linha,
.radio-linha {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sucesso-bloco {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mensagem-sucesso {
  color: var(--color-success, #15803d);
  font-weight: 500;
}

.mensagem-erro {
  color: #b91c1c;
  font-weight: 500;
}
</style>
