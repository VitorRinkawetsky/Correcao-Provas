<script setup>
import { computed, ref, onBeforeUnmount, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QRCode from 'qrcode'
import { ArrowLeft } from '@lucide/vue'

import AnswerSheetPrint from '../components/AnswerSheetPrint.vue'
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
const cartaoSelecionado = ref(null)
const perguntasCartao = ref([])
const carregandoCartao = ref(false)
const erroCartao = ref('')
const alvoImpressao = ref('')
const baixandoPdf = ref(null) // id da versão cujo PDF está sendo gerado
const erroPdf = ref('')

// Com identificação, cada aluno tem um QR Code; sem identificação, o QR é da versão.
const codigosCorrecao = computed(() => {
  if (atribuicoes.value.length) {
    return atribuicoes.value.map((atribuicao) => ({
      chave: `aluno-${atribuicao.id}`,
      titulo: atribuicao.studentName,
      detalhe: `Matrícula ${atribuicao.registration} · Versão ${atribuicao.versionNumber}`,
      codigo: atribuicao.qrCodePayload,
      versionId: atribuicao.versionId,
      versionNumber: atribuicao.versionNumber,
      identity: `${atribuicao.studentName} · Matrícula ${atribuicao.registration}`
    }))
  }

  return versoes.value.map((versao) => ({
    chave: `versao-${versao.id}`,
    titulo: `Versão ${versao.versionNumber}`,
    detalhe: 'Prova sem identificação do aluno',
    codigo: versao.qrCodePayload,
    versionId: versao.id,
    versionNumber: versao.versionNumber,
    identity: 'Prova sem identificação do aluno'
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

/* ---------- Requisições ---------- */

// Monta o Error de uma resposta HTTP que falhou (JSON ou texto) e avisa a sessão em caso de 401.
function criarErroHttp(url, response, resultado) {
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
  return error
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
    throw criarErroHttp(url, response, resultado)
  }

  return resultado
}

async function requisicaoArquivo(url) {
  const response = await fetch(url, {
    credentials: 'include'
  })

  if (!response.ok) {
    let resultado = {}

    try {
      resultado = await response.json()
    } catch {
      resultado = { message: `Não foi possível gerar o arquivo (erro ${response.status}).` }
    }

    throw criarErroHttp(url, response, resultado)
  }

  return response.blob()
}

function salvarArquivo(blob, nomeArquivo) {
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = blobUrl
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(blobUrl)
}

/* ---------- Versões e gabarito ---------- */

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

/* ---------- PDF da prova (folha de questões + cartão-resposta) ---------- */

async function baixarPdfVersao(versao) {
  baixandoPdf.value = versao.id
  erroPdf.value = ''

  try {
    const blob = await requisicaoArquivo(`/api/application-versions/${versao.id}/pdf`)
    salvarArquivo(blob, `prova-versao-${versao.versionNumber ?? versao.id}.pdf`)
  } catch (error) {
    erroPdf.value = error.message || 'Não foi possível baixar o PDF.'
  } finally {
    baixandoPdf.value = null
  }
}

/* ---------- Impressão pelo navegador (gabarito e cartão antigo) ---------- */

function imprimirGabarito() {
  alvoImpressao.value = 'gabarito'
  document.body.classList.add('answer-key-printing')
  window.addEventListener('afterprint', limparModoImpressao, { once: true })
  window.print()
}

async function abrirCartao(item) {
  carregandoCartao.value = true
  erroCartao.value = ''
  cartaoSelecionado.value = null
  perguntasCartao.value = []

  try {
    const resultado = await requisicaoJson(
      `/api/application-versions/${item.versionId}/answer-key`
    )
    const questions = resultado.data?.questions
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('A versão não possui questões para o cartão-resposta.')
    }
    perguntasCartao.value = questions.map((question) => ({
      order: Number(question.order),
      alternativeCount: Number(question.alternativeCount)
    }))
    cartaoSelecionado.value = {
      ...item,
      examTitle: resultado.data.examTitle || 'Cartão-resposta'
    }
  } catch (error) {
    erroCartao.value = error.message || 'Não foi possível montar o cartão-resposta.'
  } finally {
    carregandoCartao.value = false
  }
}

async function imprimirCartao() {
  alvoImpressao.value = 'cartao'
  document.body.classList.add('answer-sheet-printing')
  window.addEventListener('afterprint', limparModoImpressao, { once: true })
  await nextTick()
  window.print()
}

function limparModoImpressao() {
  document.body.classList.remove('answer-sheet-printing', 'answer-key-printing')
}

function voltarDetalhes() {
  router.push({
    name: 'application-details',
    params: { id: aplicacaoId }
  })
}

onMounted(carregarVersoes)
onBeforeUnmount(limparModoImpressao)
</script>

<template>
  <section
    class="pagina"
    :class="`imprimir-${alvoImpressao || 'nenhum'}`"
  >
    <button
      type="button"
      class="back-link voltar"
      @click="voltarDetalhes"
    >
      <ArrowLeft :size="16" />
      Voltar para aplicação
    </button>

    <header class="app-page__heading cabecalho">
      <div>
        <p class="eyebrow">Aplicação</p>
        <h1>Versões da prova</h1>
        <p class="app-page__lead">
          Consulte o gabarito, baixe o PDF e imprima o cartão-resposta de cada versão.
        </p>
      </div>
    </header>

    <p v-if="carregando" class="empty-state">Carregando versões...</p>

    <p v-else-if="erro" class="app-message app-message--error" role="alert">
      {{ erro }}
    </p>

    <div v-else-if="versoes.length === 0" class="empty-state">
      Nenhuma versão foi gerada para esta aplicação.
    </div>

    <div v-else class="lista-versoes">
      <article
        v-for="versao in versoes"
        :key="versao.id"
        class="cartao-versao"
      >
        <div class="cartao-versao__info">
          <h2>Versão {{ versao.versionNumber }}</h2>
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

        <div class="cartao-versao__acoes">
          <button
            type="button"
            class="button button--primary"
            :disabled="carregandoGabarito"
            @click="abrirGabarito(versao)"
          >
            {{ carregandoGabarito && versaoSelecionada?.id === versao.id
              ? 'Carregando...'
              : 'Ver gabarito' }}
          </button>

          <button
            type="button"
            class="button button--primary"
            :disabled="baixandoPdf !== null"
            @click="baixarPdfVersao(versao)"
          >
            {{ baixandoPdf === versao.id ? 'Gerando PDF...' : 'Baixar PDF' }}
          </button>
        </div>
      </article>
    </div>

    <p v-if="erroPdf" class="app-message app-message--error" role="alert">
      {{ erroPdf }}
    </p>

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
              class="button button--secondary"
              @click="copiarCodigo(item)"
            >
              {{ copiado === item.chave ? 'Código copiado' : 'Copiar código' }}
            </button>
            <button
              type="button"
              class="button button--secondary"
              :disabled="carregandoCartao"
              @click="abrirCartao(item)"
            >
              Cartão-resposta
            </button>
          </div>
        </article>
      </div>
    </section>

    <p v-if="erroCartao" class="app-message app-message--error" role="alert">
      {{ erroCartao }}
    </p>

    <section
      v-if="cartaoSelecionado"
      class="cartao-impressao"
      aria-labelledby="cartao-titulo"
    >
      <div class="cartao-impressao__acoes">
        <h2 id="cartao-titulo">Cartão-resposta pronto para imprimir</h2>
        <button type="button" class="button button--primary" @click="imprimirCartao">
          Imprimir / salvar PDF
        </button>
      </div>
      <AnswerSheetPrint
        :qr-data-url="imagensQr[cartaoSelecionado.chave]"
        :exam-title="cartaoSelecionado.examTitle"
        :identity="cartaoSelecionado.identity"
        :version-label="`Versão ${cartaoSelecionado.versionNumber}`"
        :questions="perguntasCartao"
      />
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

      <p v-else-if="erroGabarito" class="app-message app-message--error" role="alert">
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
          class="button button--primary"
          @click="imprimirGabarito"
        >
          Imprimir gabarito
        </button>
      </template>
    </section>
  </section>
</template>

<style scoped>
.pagina {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(1.5rem, 4vw, 2.5rem);
}

.voltar {
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.lista-versoes {
  display: grid;
  gap: var(--space-4);
}

.cartao-versao {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-5);
  padding: clamp(1.25rem, 3vw, 1.75rem);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.cartao-versao__info {
  display: grid;
  gap: var(--space-1);
  color: var(--color-muted);
  font-size: 0.9rem;
}

.cartao-versao h2 {
  margin-bottom: var(--space-2);
  font-size: 1.2rem;
}

.cartao-versao__acoes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.gabarito,
.codigos,
.cartao-impressao {
  display: grid;
  gap: var(--space-4);
  padding: clamp(1.25rem, 3vw, 1.75rem);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.gabarito h2,
.codigos h2,
.cartao-impressao h2 {
  font-size: clamp(1.15rem, 2.4vw, 1.35rem);
}

.gabarito ol {
  margin: 0;
  padding-left: var(--space-5);
}

.gabarito li {
  margin: var(--space-2) 0;
}

.gabarito .button {
  justify-self: start;
}

.codigos__ajuda {
  color: var(--color-muted);
}

.codigos__lista {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-3);
}

.codigo {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
}

.codigo > div {
  display: grid;
  gap: var(--space-2);
}

.codigo strong {
  color: var(--color-heading);
}

.codigo p {
  color: var(--color-muted);
  font-size: 0.86rem;
}

.codigo .button {
  white-space: nowrap;
  min-height: 38px;
  padding: 0 var(--space-4);
  font-size: 0.84rem;
}

.cartao-impressao__acoes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

@media (max-width: 600px) {
  .cartao-versao {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media print {
  .pagina.imprimir-cartao > :not(.cartao-impressao),
  .pagina.imprimir-cartao .cartao-impressao__acoes {
    display: none !important;
  }

  .pagina.imprimir-cartao,
  .pagina.imprimir-gabarito {
    display: block;
    padding: 0;
  }

  .pagina.imprimir-cartao .cartao-impressao {
    max-width: none;
    margin: 0;
    padding: 0;
    border: 0;
    box-shadow: none;
  }

  .pagina.imprimir-gabarito .voltar,
  .pagina.imprimir-gabarito .cabecalho,
  .pagina.imprimir-gabarito .lista-versoes,
  .pagina.imprimir-gabarito .codigos,
  .pagina.imprimir-gabarito .cartao-impressao,
  .pagina.imprimir-gabarito .gabarito button {
    display: none !important;
  }

  .pagina.imprimir-gabarito .gabarito {
    max-width: none;
    border: 0;
    box-shadow: none;
  }
}
</style>
