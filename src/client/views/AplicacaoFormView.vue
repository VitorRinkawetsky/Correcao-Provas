
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listExams } from '../services/examApi'
import { getClasses } from '../services/classApi'
import { createApplication } from '../services/applicationApi'

const router = useRouter()

const provas = ref([])
const turmas = ref([])
const provaSelecionada = ref('')
const turmaSelecionada = ref('')
const carregando = ref(true)
const enviando = ref(false)
const erro = ref('')

onMounted(async () => {
  try {
    const [exams, classes] = await Promise.all([
      listExams(),
      getClasses()
    ])

    provas.value = exams
    turmas.value = classes.filter(
      turma => turma.status === 'active'
    )

    if (provas.value.length) {
      provaSelecionada.value = String(provas.value[0].id)
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

async function criarAplicacao() {
  erro.value = ''

  if (!provaSelecionada.value || !turmaSelecionada.value) {
    erro.value = 'Selecione uma prova e uma turma.'
    return
  }

  enviando.value = true

  try {
    const aplicacao = await createApplication({
      examId: Number(provaSelecionada.value),
      classId: Number(turmaSelecionada.value)
    })

    router.push({
      name: 'application-details',
      params: { id: aplicacao.id }
    })
  } catch (error) {
    erro.value = error.message || 'Não foi possível criar a aplicação.'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <section class="pagina">
    <router-link :to="{ name: 'applications' }" class="voltar">
      ← Voltar
    </router-link>

    <form class="formulario" @submit.prevent="criarAplicacao">
      <h1>Criar aplicação</h1>

      <p v-if="carregando">Carregando provas e turmas...</p>

      <template v-else>
        <div class="campo">
          <label for="prova">Prova</label>
          <select id="prova" v-model="provaSelecionada" required>
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
          <select id="turma" v-model="turmaSelecionada" required>
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

        <p v-if="!erro && (!provas.length || !turmas.length)">
          Não há provas ou turmas ativas disponíveis.
        </p>

        <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

        <button
          type="submit"
          class="btn-criar"
          :disabled="enviando || !provas.length || !turmas.length"
        >
          {{ enviando ? 'Criando...' : 'Criar aplicação' }}
        </button>
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
  margin-bottom: 24px;
  color: var(--color-primary, #0f5e56);
  text-decoration: none;
}

.formulario {
  max-width: 480px;
  margin: 0 auto;
  padding: 28px;
  background: var(--color-surface, #fff);
  border-radius: var(--radius-md, 12px);
}

.formulario h1 {
  margin: 0 0 24px;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.campo label {
  font-weight: 500;
}

.campo select {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 8px;
  background: white;
  font: inherit;
}

.btn-criar {
  width: 100%;
  padding: 12px;
  border: 0;
  cursor: pointer;
  font: inherit;
}

.btn-criar:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.erro {
  color: #b42318;
  margin-bottom: 16px;
}
</style>
