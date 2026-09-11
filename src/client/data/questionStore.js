import { readonly, ref } from 'vue';

import { questions as initialQuestions } from './mockData';

const STORAGE_KEY = 'sgp-catolica:questions:v1';

const clone = (value) => JSON.parse(JSON.stringify(value));

export const normalizeTags = (value) => {
    const source = Array.isArray(value) ? value : String(value || '').split(',');
    const seen = new Set();

    return source.reduce((tags, item) => {
        const tag = String(item).trim();
        const normalizedTag = tag.toLocaleLowerCase('pt-BR');

        if (tag && !seen.has(normalizedTag)) {
            seen.add(normalizedTag);
            tags.push(tag);
        }

        return tags;
    }, []);
};

export const validateQuestionInput = (input) => {
    const errors = {};
    const alternatives = Array.isArray(input.alternatives) ? input.alternatives : [];
    const correctAlternativeIndex = Number(input.correctAlternativeIndex);

    if (!String(input.statement || '').trim()) {
        errors.statement = 'Informe o enunciado da questão.';
    }

    if (alternatives.length < 2 || alternatives.length > 5) {
        errors.alternatives = 'A questão deve ter entre 2 e 5 alternativas.';
    } else if (alternatives.some((alternative) => !String(alternative.text || '').trim())) {
        errors.alternatives = 'Preencha o texto de todas as alternativas.';
    }

    if (!Number.isInteger(correctAlternativeIndex)
        || correctAlternativeIndex < 0
        || correctAlternativeIndex >= alternatives.length) {
        errors.correctAlternativeId = 'Selecione exatamente uma alternativa correta.';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
};

const normalizeQuestion = (question) => ({
    ...question,
    id: Number(question.id),
    teacherId: Number(question.teacherId || 1),
    type: 'objetiva',
    statement: String(question.statement || '').trim(),
    tags: normalizeTags(question.tags),
    alternatives: (question.alternatives || []).slice(0, 5).map((alternative) => ({
        id: Number(alternative.id),
        text: String(alternative.text || '').trim()
    })),
    correctAlternativeId: Number(question.correctAlternativeId)
});

const defaultQuestions = () => clone(initialQuestions)
    .filter((question) => question.type === 'objetiva')
    .map(normalizeQuestion);

const loadQuestions = () => {
    if (typeof window === 'undefined') return defaultQuestions();

    try {
        const storedQuestions = window.localStorage.getItem(STORAGE_KEY);
        if (storedQuestions === null) return defaultQuestions();

        const parsedQuestions = JSON.parse(storedQuestions);
        if (!Array.isArray(parsedQuestions)) return defaultQuestions();

        return parsedQuestions
            .filter((question) => question?.type === 'objetiva')
            .map(normalizeQuestion);
    } catch {
        return defaultQuestions();
    }
};

const questionsState = ref(loadQuestions());

const persistQuestions = () => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(questionsState.value));
    } catch {
        // A interface continua funcional durante a sessão quando o armazenamento está indisponível.
    }
};

const nextQuestionId = () => Math.max(0, ...questionsState.value.map((question) => question.id)) + 1;

const nextAlternativeId = () => Math.max(
    0,
    ...questionsState.value.flatMap((question) => question.alternatives.map((alternative) => alternative.id))
) + 1;

const getQuestion = (id) => questionsState.value.find((question) => question.id === Number(id)) || null;

const saveQuestion = (input, id = null) => {
    const validation = validateQuestionInput(input);
    if (!validation.valid) {
        const error = new Error('Não foi possível salvar a questão.');
        error.validationErrors = validation.errors;
        throw error;
    }

    const existingQuestion = id === null ? null : getQuestion(id);
    if (id !== null && !existingQuestion) {
        throw new Error('Questão não encontrada.');
    }

    let alternativeId = nextAlternativeId();
    const alternatives = input.alternatives.map((alternative) => ({
        id: alternative.id !== null
            && alternative.id !== undefined
            && Number.isFinite(Number(alternative.id))
            ? Number(alternative.id)
            : alternativeId++,
        text: String(alternative.text).trim()
    }));

    const question = {
        id: existingQuestion?.id ?? nextQuestionId(),
        teacherId: existingQuestion?.teacherId ?? 1,
        type: 'objetiva',
        statement: String(input.statement).trim(),
        tags: normalizeTags(input.tags),
        alternatives,
        correctAlternativeId: alternatives[Number(input.correctAlternativeIndex)].id
    };

    if (existingQuestion) {
        questionsState.value = questionsState.value.map((item) => item.id === question.id ? question : item);
    } else {
        questionsState.value = [question, ...questionsState.value];
    }

    persistQuestions();
    return clone(question);
};

const deleteQuestion = (id) => {
    const nextQuestions = questionsState.value.filter((question) => question.id !== Number(id));
    if (nextQuestions.length === questionsState.value.length) return false;

    questionsState.value = nextQuestions;
    persistQuestions();
    return true;
};

export const useQuestionStore = () => ({
    questions: readonly(questionsState),
    getQuestion,
    saveQuestion,
    deleteQuestion
});
