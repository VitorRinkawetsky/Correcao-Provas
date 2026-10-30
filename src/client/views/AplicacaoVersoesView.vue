
<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QRCode from 'qrcode'

import { reportUnauthorized } from '../services/apiClient'

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
const atribuicoes = ref([])
const imagensQr = ref({})
const copiado = ref('')

// Com identificação, cada aluno tem um QR Code; sem identificação, o QR é da versão.
const codigosCorrecao = computed(() => {
  if (atribuicoes.value.length) {
    return atribuicoes.value.map((atribuicao) => ({
      chave: `aluno-${atribuicao.id}`,
      titulo: atribuicao.studentName,
      detalhe: `Matrícula ${atribuicao.registration} · Versão ${atribuicao.versionNumber}`,
      codigo: atribuicao.qrCodePayload
    }))
  }

  return versoes.value.map((versao) => ({
    chave: `versao-${versao.id}`,
    titulo: `Versão ${versao.versionNumber}`,
    detalhe: 'Prova sem identificação do aluno',
    codigo: versao.qrCodePayload
  }))
})

async function gerarImagensQr() {
  const imagens = {}

  for (const item of codigosCorrecao.value) {
    if (item.codigo) {
      imagens[item.chave] = await QRCode.toDataURL(item.codigo, { margin: 1, width: 160 })
    }
  }

  imagensQr.value = imagens
}

async function copiarCodigo(item) {
  try {
    await navigator.clipboard.writeText(item.codigo)
    copiado.value = item.chave
  } catch {
    copiado.value = ''
  }
}

async function requisicaoJson(url) {
  const response = await fetch(url, {
    credentials: 'include'
  })

  const texto = await response.text()
  let resultado = {}

  try {
    resultado = texto ? JSON.parse(texto) : {}
  } catch {
    resultado = { message: texto }
  }

  if (!response.ok) {
    const serverError = typeof resultado.error === 'string'
      ? resultado.error
      : resultado.error?.message
    const error = new Error(
      resultado.message ||
      serverError ||
      `Erro HTTP ${response.status}`
    )
    error.status = response.status
    if (response.status === 401) reportUnauthorized(url, error)
    throw error
  }

  return resultado
}

async function carregarVersoes() {
  carregando.value = true
  erro.value = ''

  try {
    const resultado = await requisicaoJson(
      `/api/application-versions/applications/${aplicacaoId}`
    )

    versoes.value = resultado.data ?? []

    const resultadoAtribuicoes = await requisicaoJson(
      `/api/application-versions/applications/${aplicacaoId}/assignments`
    )

    atribuicoes.value = resultadoAtribuicoes.data ?? []
    await gerarImagensQr()
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
    const resultado = await requisicaoJson(
      `/api/application-versions/${versao.id}/answer-key`
    )

    if (!resultado.data) {
      throw new Error('O servidor não retornou os dados do gabarito.')
    }

    prova.value = {
      nome: resultado.data.examTitle || 'Gabarito da prova'
    }

    gabarito.value = resultado.data.questions ?? []
  } catch (error) {
    console.error('Erro ao carregar gabarito:', error)
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
      v-if="!carregando && codigosCorrecao.length"
      class="codigos"
      aria-labelledby="codigos-titulo"
    >
      <h2 id="codigos-titulo">QR Codes para correção</h2>
      <p class="codigos__ajuda">
        Use o QR Code (ou copie o código) na tela "Corrigir por QR Code".
      </p>

      <div class="codigos__lista">
        <article
          v-for="item in codigosCorrecao"
          :key="item.chave"
          class="codigo"
        >
          <img
            v-if="imagensQr[item.chave]"
            :src="imagensQr[item.chave]"
            :alt="`QR Code de ${item.titulo}`"
            width="120"
            height="120"
          >
          <div>
            <strong>{{ item.titulo }}</strong>
            <p>{{ item.detalhe }}</p>
            <button
              type="button"
              class="botao botao--secundario"
              @click="copiarCodigo(item)"
            >
              {{ copiado === item.chave ? 'Código copiado' : 'Copiar código' }}
            </button>
          </div>
        </article>
      </div>
    </section>

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

.codigos {
  margin-top: 28px;
  max-width: 900px;
}

.codigos__ajuda {
  margin: 0 0 16px;
  color: var(--color-muted, #5b6b69);
}

.codigos__lista {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.codigo {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--color-border, #d8e1df);
  border-radius: 10px;
  background: var(--color-surface, #fff);
}

.codigo p {
  margin: 4px 0 10px;
  font-size: 0.9rem;
}

.botao--secundario {
  padding: 8px 12px;
  border: 1px solid var(--color-primary, #0f5e56);
  background: transparent;
  color: var(--color-primary, #0f5e56);
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
