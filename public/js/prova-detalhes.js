import { Navbar } from '../components/navbar.js';
import { QuestaoCard } from '../components/questaoCard.js';
import { loadExamDetails } from './api.js';

const navbar = document.getElementById('navbar');
const container = document.getElementById('prova-detalhes');

navbar.innerHTML = Navbar();

function getStatusLabel(status) {
    if (status === 'ready') {
        return 'Pronta';
    }

    if (status === 'draft') {
        return 'Rascunho';
    }

    if (status === 'closed') {
        return 'Encerrada';
    }

    return status;
}

function formatScore(value) {
    return Number(value).toFixed(1);
}

function renderProva() {
    const params = new URLSearchParams(window.location.search);
    const examId = Number(params.get('id')) || 1;
    const prova = loadExamDetails(examId);

    if (!prova) {
        container.innerHTML = '<p>Prova não encontrada.</p>';
        return;
    }

    const questoesHtml = prova.questions
        .map((questao) => QuestaoCard(questao))
        .join('');

    container.innerHTML = `
        <h1>${prova.title}</h1>

        <div class="prova-detalhes-info">
            <p>${prova.description}</p>
            <p><strong>Status:</strong> ${getStatusLabel(prova.status)}</p>
            <p><strong>Questões:</strong> ${prova.questionCount}</p>
            <p><strong>Pontuação:</strong> ${formatScore(prova.totalScore)}</p>
        </div>

        <div class="prova-acoes">
            <button type="button">Editar</button>
            <button type="button">Criar aplicação</button>
            <button type="button">Arquivar</button>
        </div>

        <hr class="prova-divisor">

        <div class="prova-questoes">
            ${questoesHtml}
        </div>
    `;
}

renderProva();
