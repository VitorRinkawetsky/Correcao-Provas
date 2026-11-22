
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { requestJson } from '../services/apiClient'

const route = useRoute()
const router = useRouter()

const aplicacaoId = route.params.id
const versoes = ref([])
const versaoSelecionada = ref(null)
const prova = ref({ nome: 'Gabarito' })
const gabarito = ref([])
const carregando = ref(true)
const carregandoGabarito = ref(false)
const erro = ref('')
const erroGabarito = ref('')

async function carregarVersoes() {
  carregando.value = true
  erro.value = ''

  try {
    versoes.value = await requestJson(
      `/api/application-versions/applications/${aplicacaoId}`
    ) ?? []
  } catch (error) {
    erro.value = error.message || 'Não foi possível carregar as versões.'
  } finally {
    carregando.value = false
  }
}

async function abrirGabarito(versao) {
  carregandoGabarito.value = true
  erroGabarito.value = ''
  versaoSelecionada.value = versao
  gabarito.value = []

  try {
    const resultado = await requestJson(
      `/api/application-versions/${versao.id}/answer-key`
    )

    if (!resultado) {
      throw new Error('O servidor não retornou os dados do gabarito.')
    }

    prova.value = {
      nome: resultado.examTitle || 'Gabarito da prova'
    }

    gabarito.value = resultado.questions ?? []
  } catch (error) {
    erroGabarito.value =
      error.message || 'Não foi possível carregar o gabarito.'
  } finally {
    carregandoGabarito.value = false
  }
}

function baixarPdf() {
  window.print()
}

function voltarDetalhes() {
  router.push({
    name: 'application-details',
    params: { id: aplicacaoId }
  })
}

onMounted(carregarVersoes)
</script>

<template>
  <section class="pagina">
    <button
      type="button"
      class="voltar"
      @click="voltarDetalhes"
    >
      ← Voltar para aplicação
    </button>

    <h1>Versões da prova</h1>

    <p v-if="carregando">Carregando versões...</p>

    <p v-else-if="erro" class="erro" role="alert">
      {{ erro }}
    </p>

    <div v-else-if="versoes.length === 0" class="vazio">
      Nenhuma versão foi gerada para esta aplicação.
    </div>

    <div v-else class="lista-versoes">
      <article
        v-for="versao in versoes"
        :key="versao.id"
        class="cartao-versao"
      >
        <div>
          <h2>Versão {{ versao.versionNumber }}</h2>
          <p>ID: {{ versao.id }}</p>
          <p>
            Questões embaralhadas:
            {{ versao.shuffleQuestions ? 'Sim' : 'Não' }}
          </p>
          <p>
            Alternativas embaralhadas:
            {{ versao.shuffleAlternatives ? 'Sim' : 'Não' }}
          </p>
          <p>
            Identificação:
            {{ versao.withStudentIdentification
              ? 'Com identificação'
              : 'Sem identificação' }}
          </p>
        </div>

        <button
          type="button"
          class="botao"
          :disabled="carregandoGabarito"
          @click="abrirGabarito(versao)"
        >
          {{ carregandoGabarito && versaoSelecionada?.id === versao.id
            ? 'Carregando...'
            : 'Ver gabarito' }}
        </button>
      </article>
    </div>

    <section
      v-if="versaoSelecionada"
      class="gabarito"
      aria-live="polite"
    >
      <h2>
        {{ prova.nome }} — Versão
        {{ versaoSelecionada.versionNumber }}
      </h2>

      <p v-if="carregandoGabarito">
        Carregando gabarito...
      </p>

      <p v-else-if="erroGabarito" class="erro" role="alert">
        {{ erroGabarito }}
      </p>

      <template v-else>
        <p v-if="gabarito.length === 0">
          Nenhuma resposta foi retornada para esta versão.
        </p>

        <ol v-else>
          <li
            v-for="questao in gabarito"
            :key="questao.questionId"
          >
            Questão {{ questao.order }}:
            <strong>
              {{ questao.correctAlternative || 'Sem resposta correta' }}
            </strong>
          </li>
        </ol>

        <button
          v-if="gabarito.length"
          type="button"
          class="botao"
          @click="baixarPdf"
        >
          Imprimir / salvar PDF
        </button>
      </template>
    </section>
  </section>
</template>

<style scoped>
.pagina {
  padding: 24px;
}

.voltar {
  margin-bottom: 20px;
  border: 0;
  background: transparent;
  color: var(--color-primary, #0f5e56);
  cursor: pointer;
  font: inherit;
}

h1 {
  margin-bottom: 20px;
}

.lista-versoes {
  display: grid;
  gap: 16px;
  max-width: 900px;
}

.cartao-versao {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 22px;
  border: 1px solid var(--color-border, #d8e1df);
  border-radius: 10px;
  background: var(--color-surface, #fff);
}

.cartao-versao h2 {
  margin: 0 0 12px;
}

.cartao-versao p {
  margin: 8px 0;
}

.botao {
  padding: 12px 20px;
  border: 0;
  border-radius: 7px;
  background: var(--color-primary, #0f5e56);
  color: white;
  cursor: pointer;
  font: inherit;
}

.botao:disabled {
  opacity: 0.6;
  cursor: wait;
}

.gabarito {
  margin-top: 28px;
  padding: 24px;
  max-width: 900px;
  border: 1px solid var(--color-border, #d8e1df);
  border-radius: 10px;
  background: var(--color-surface, #fff);
}

.gabarito li {
  margin: 12px 0;
}

.erro {
  color: #b91c1c;
}

.vazio {
  padding: 20px;
  border-radius: 8px;
  background: var(--color-surface, #fff);
}

@media (max-width: 600px) {
  .cartao-versao {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media print {
  .voltar,
  .lista-versoes,
  .gabarito button {
    display: none !important;
  }

  .pagina {
    padding: 0;
  }

  .gabarito {
    max-width: none;
    border: 0;
  }
}
</style>
