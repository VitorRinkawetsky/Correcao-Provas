
<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

watch(quantidadeVersoes, (valor) => {
  const nova = Math.min(50, Math.max(1, Number(valor) || 1))
  if (nova !== valor) quantidadeVersoes.value = nova

  while (versoes.value.length < nova) {
    versoes.value.push(versaoPadrao())
  }

  if (versoes.value.length > nova) {
    versoes.value.splice(nova)
  }
})

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
  <section class="pagina">
    <router-link
      :to="{ name: 'applications' }"
      class="voltar"
    >
      ← Voltar
    </router-link>

    <form class="formulario" @submit.prevent="gerarProva">
      <h1>Gerar prova</h1>

      <p class="descricao">
        Configure a aplicação e as versões da prova em uma única etapa.
      </p>

      <p v-if="carregando">Carregando provas e turmas...</p>

      <template v-else>
        <div class="campo">
          <label for="prova">Prova</label>
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
        </div>

        <div class="campo">
          <label for="turma">Turma</label>
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
        </div>

        <div class="campo">
          <label for="qtd-versoes">Quantidade de versões</label>
          <input
            id="qtd-versoes"
            v-model.number="quantidadeVersoes"
            type="number"
            min="1"
            max="50"
            required
            :disabled="enviando"
          />
          <small>Escolha entre 1 e 50 versões.</small>
        </div>

        <section class="configuracoes">
          <h2>Configuração das versões</h2>

          <div
            v-for="(versao, index) in versoes"
            :key="index"
            class="versao-bloco"
          >
            <h3>Versão {{ index + 1 }}</h3>

            <label class="opcao">
              <input
                v-model="versao.embaralharQuestoes"
                type="checkbox"
                :disabled="enviando"
              />
              Embaralhar questões
            </label>

            <label class="opcao">
              <input
                v-model="versao.embaralharAlternativas"
                type="checkbox"
                :disabled="enviando"
              />
              Embaralhar alternativas
            </label>
          </div>
        </section>

        <section class="campo identificacao">
          <h2>Identificação dos alunos</h2>

          <label class="opcao">
            <input
              v-model="identificacao"
              type="radio"
              value="com"
              :disabled="enviando"
            />
            Com identificação
          </label>

          <label class="opcao">
            <input
              v-model="identificacao"
              type="radio"
              value="sem"
              :disabled="enviando"
            />
            Sem identificação
          </label>
        </section>

        <p
          v-if="!provas.length || !turmas.length"
          class="mensagem-erro"
          role="alert"
        >
          Não há provas ou turmas ativas disponíveis.
        </p>

        <p v-if="erro" class="mensagem-erro" role="alert">
          {{ erro }}
        </p>

        <button
          type="submit"
          class="btn-gerar"
          :disabled="
            enviando ||
            !provas.length ||
            !turmas.length
          "
        >
          {{ enviando ? 'Gerando prova...' : 'Gerar prova' }}
        </button>

        <p v-if="aplicacaoId" class="aviso">
          A aplicação já foi criada. Uma nova tentativa não criará
          outra aplicação.
        </p>
      </template>
    </form>
  </section>
</template>

<style scoped>
.pagina {
  padding: 24px;
}

.voltar {
  display: inline-block;
  margin-bottom: 20px;
  color: var(--color-primary, #0f5e56);
  text-decoration: none;
}

.formulario {
  max-width: 600px;
  margin: 0 auto;
  padding: 28px;
  background: var(--color-surface, #fff);
  border-radius: var(--radius-md, 12px);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.formulario h1 {
  margin: 0;
}

.descricao {
  margin: -10px 0 0;
  color: #666;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.campo label,
.campo h2 {
  font-weight: 600;
}

.campo h2 {
  margin: 0 0 8px;
  font-size: 1.05rem;
}

.campo select,
.campo input[type="number"] {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 8px;
  background: white;
  font: inherit;
}

.campo small {
  color: #666;
}

.configuracoes {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.configuracoes h2 {
  margin: 0;
  font-size: 1.1rem;
}

.versao-bloco {
  padding: 16px;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.versao-bloco h3 {
  margin: 0;
  color: var(--color-primary, #0f5e56);
}

.opcao {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.opcao input {
  width: 18px;
  height: 18px;
}

.identificacao {
  padding-top: 8px;
}

.btn-gerar {
  width: 100%;
  min-height: 48px;
  padding: 12px;
  border: 0;
  border-radius: 8px;
  background: var(--color-primary, #0f5e56);
  color: white;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.btn-gerar:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.mensagem-erro {
  color: #b42318;
  font-weight: 500;
}

.aviso {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}
</style>
