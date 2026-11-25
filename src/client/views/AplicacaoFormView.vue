
<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, FilePlus2 } from '@lucide/vue'
import { listExams } from '../services/examApi'
import { getClasses } from '../services/classApi'
import { createApplication } from '../services/applicationApi'
import { requestJson } from '../services/apiClient'

const route = useRoute()
const router = useRouter()

const provas = ref([])
const turmas = ref([])
const provaSelecionada = ref('')
const turmaSelecionada = ref('')

const quantidadeVersoes = ref(3)
const identificacao = ref('com')

const carregando = ref(true)
const enviando = ref(false)
const erro = ref('')
const aplicacaoId = ref(null)

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

onMounted(async () => {
  try {
    const [exams, classes] = await Promise.all([
      listExams(),
      getClasses(),
    ])

    provas.value = exams.filter(
      prova => prova.status !== 'archived' && prova.status !== 'closed'
    )

    turmas.value = classes.filter(
      turma => turma.status === 'active'
    )

    const provaDaRota = provas.value.find(
      prova => String(prova.id) === String(route.query.examId)
    )

    if (provaDaRota || provas.value.length) {
      provaSelecionada.value = String(
        (provaDaRota || provas.value[0]).id
      )
    }

    if (turmas.value.length) {
      turmaSelecionada.value = String(turmas.value[0].id)
    }
  } catch (error) {
    erro.value = error.message || 'Não foi possível carregar os dados.'
  } finally {
    carregando.value = false
  }
})

async function gerarProva() {
  erro.value = ''

  if (!provaSelecionada.value || !turmaSelecionada.value) {
    erro.value = 'Selecione uma prova e uma turma.'
    return
  }

  if (
    !Number.isInteger(Number(quantidadeVersoes.value)) ||
    quantidadeVersoes.value < 1 ||
    quantidadeVersoes.value > 50
  ) {
    erro.value = 'A quantidade deve estar entre 1 e 50 versões.'
    return
  }

  enviando.value = true

  try {
    // Cria a aplicação somente uma vez.
    // Se a geração falhar, o ID fica guardado para nova tentativa.
    if (!aplicacaoId.value) {
      const aplicacao = await createApplication({
        examId: Number(provaSelecionada.value),
        classId: Number(turmaSelecionada.value),
      })

      aplicacaoId.value = aplicacao.id
    }

    await requestJson(
      `/api/application-versions/applications/${aplicacaoId.value}/generate`,
      {
        method: 'POST',
        body: JSON.stringify({
          versoes: versoes.value.map(versao => ({
            embaralharQuestoes: versao.embaralharQuestoes,
            embaralharAlternativas: versao.embaralharAlternativas,
            identificacao: identificacao.value === 'com',
          })),
        }),
      }
    )

    router.push({
      name: 'application-versions',
      params: { id: aplicacaoId.value },
    })
  } catch (error) {
    erro.value = error.message ||
      'Não foi possível gerar a prova. Você pode tentar novamente.'
  } finally {
    enviando.value = false
  }
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
        <h1>Gerar prova</h1>
        <p class="app-page__lead">
          Configure a aplicação e as versões da prova em uma única etapa.
        </p>
      </div>
    </header>

    <p v-if="carregando" class="empty-state">Carregando provas e turmas...</p>

    <form v-else class="surface-card formulario" @submit.prevent="gerarProva">
      <div class="grade-campos">
        <label class="app-field" for="prova">
          Prova
          <select
            id="prova"
            v-model="provaSelecionada"
            required
            :disabled="enviando || !!aplicacaoId"
          >
            <option disabled value="">Selecione uma prova</option>
            <option
              v-for="prova in provas"
              :key="prova.id"
              :value="String(prova.id)"
            >
              {{ prova.title }}
            </option>
          </select>
        </label>

        <label class="app-field" for="turma">
          Turma
          <select
            id="turma"
            v-model="turmaSelecionada"
            required
            :disabled="enviando || !!aplicacaoId"
          >
            <option disabled value="">Selecione uma turma</option>
            <option
              v-for="turma in turmas"
              :key="turma.id"
              :value="String(turma.id)"
            >
              {{ turma.name }}
            </option>
          </select>
        </label>

        <label class="app-field" for="qtd-versoes">
          Quantidade de versões
          <input
            id="qtd-versoes"
            v-model.number="quantidadeVersoes"
            type="number"
            @blur="normalizarQuantidade"
            min="1"
            max="50"
            required
            :disabled="enviando"
          />
          <small>Escolha entre 1 e 50 versões.</small>
        </label>
      </div>

      <section class="secao">
        <h2>Configuração das versões</h2>

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
                :disabled="enviando"
              />
              Embaralhar questões
            </label>

            <label class="app-check">
              <input
                v-model="versao.embaralharAlternativas"
                type="checkbox"
                :disabled="enviando"
              />
              Embaralhar alternativas
            </label>
          </div>
        </div>
      </section>

      <section class="secao">
        <h2>Identificação dos alunos</h2>

        <div class="button-row">
          <label class="app-check">
            <input
              v-model="identificacao"
              type="radio"
              value="com"
              :disabled="enviando"
            />
            Com identificação
          </label>

          <label class="app-check">
            <input
              v-model="identificacao"
              type="radio"
              value="sem"
              :disabled="enviando"
            />
            Sem identificação
          </label>
        </div>
      </section>

      <p
        v-if="!provas.length || !turmas.length"
        class="app-message app-message--error"
        role="alert"
      >
        Não há provas ou turmas ativas disponíveis.
      </p>

      <p v-if="erro" class="app-message app-message--error" role="alert">
        {{ erro }}
      </p>

      <p v-if="aplicacaoId" class="app-message">
        A aplicação já foi criada. Uma nova tentativa não criará
        outra aplicação.
      </p>

      <div class="button-row">
        <button
          type="submit"
          class="button button--primary"
          :disabled="
            enviando ||
            !provas.length ||
            !turmas.length
          "
        >
          <FilePlus2 :size="17" />
          {{ enviando ? 'Gerando prova...' : 'Gerar prova' }}
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.formulario {
  max-width: 820px;
  gap: var(--space-6);
}

.grade-campos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-5);
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
</style>
