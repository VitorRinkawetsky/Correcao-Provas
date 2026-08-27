export function QuestaoCard(questao) {
    return `
        <div class="questao-card">
            <p>${questao.order}. ${questao.statement}</p>
            <p class="questao-card-valor">Valor: ${Number(questao.score).toFixed(1)}</p>
        </div>
    `;
}
