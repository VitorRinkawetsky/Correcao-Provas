import { readonly, ref } from 'vue';

import { reportUnauthorized } from '../services/apiClient';

const clone = (value) => JSON.parse(JSON.stringify(value));

export const normalizeTags = (value) => {
    const source = Array.isArray(value)
        ? value
        : String(value || '').split(',');

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
    const alternatives = Array.isArray(input.alternatives)
        ? input.alternatives
        : [];

    const correctAlternativeIndex = Number(
        input.correctAlternativeIndex
    );

    if (!String(input.statement || '').trim()) {
        errors.statement = 'Informe o enunciado da questão.';
    }

    if (alternatives.length < 2 || alternatives.length > 5) {
        errors.alternatives =
            'A questão deve ter entre 2 e 5 alternativas.';
    } else if (
        alternatives.some(
            (alternative) =>
                !String(alternative.text || '').trim()
        )
    ) {
        errors.alternatives =
            'Preencha o texto de todas as alternativas.';
    }

    if (
        !Number.isInteger(correctAlternativeIndex) ||
        correctAlternativeIndex < 0 ||
        correctAlternativeIndex >= alternatives.length
    ) {
        errors.correctAlternativeId =
            'Selecione exatamente uma alternativa correta.';
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
    status: question.status || 'active',
    tags: normalizeTags(question.tags),
    alternatives: (question.alternatives || [])
        .slice(0, 5)
        .map((alternative) => ({
            id: Number(alternative.id),
            text: String(alternative.text || '').trim(),
            position: Number(alternative.position || 0),
            isCorrect: Boolean(alternative.isCorrect)
        })),
    correctAlternativeId: question.correctAlternativeId == null
        ? null
        : Number(question.correctAlternativeId)
});

// A API responde { error: { message, details } }; mantém suporte a { message }.
const apiErrorMessage = (data, fallback) =>
    data?.error?.message || data?.message || fallback;

const apiValidationErrors = (data) => {
    const details = data?.error?.details;

    if (!Array.isArray(details)) return data?.validationErrors || {};

    return details.reduce((errors, detail) => {
        if (detail?.field && detail?.message) {
            errors[detail.field] = detail.message;
        }
        return errors;
    }, {});
};

const questionsState = ref([]);

const getQuestion = (id) =>
    questionsState.value.find(
        (question) => question.id === Number(id)
    ) || null;

export const loadQuestions = async () => {
    const response = await fetch('/api/questions');

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        const error = new Error(
            apiErrorMessage(
                data,
                'Não foi possível carregar as questões.'
            )
        );
        error.status = response.status;
        if (response.status === 401) reportUnauthorized('/api/questions', error);
        throw error;
    }

    const data = await response.json();

    questionsState.value = Array.isArray(data)
        ? data.map(normalizeQuestion)
        : [];

    return questionsState.value;
};

const saveQuestion = async (input, id = null) => {
    const validation = validateQuestionInput(input);

    if (!validation.valid) {
        const error = new Error(
            'Não foi possível salvar a questão.'
        );

        error.validationErrors = validation.errors;
        throw error;
    }

    const payload = {
        statement: String(input.statement).trim(),
        tags: normalizeTags(input.tags),
        alternatives: input.alternatives.map(
            (alternative) => ({
                text: String(alternative.text).trim()
            })
        ),
        correctAlternativeIndex: Number(
            input.correctAlternativeIndex
        )
    };

    const url = id === null
        ? '/api/questions'
        : `/api/questions/${id}`;

    const method = id === null ? 'POST' : 'PUT';

    const response = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            apiErrorMessage(
                data,
                'Não foi possível salvar a questão.'
            )
        );

        error.validationErrors = apiValidationErrors(data);
        error.status = response.status;
        if (response.status === 401) reportUnauthorized(url, error);

        throw error;
    }

    await loadQuestions();

    return data;
};

const deleteQuestion = async (id) => {
    const response = await fetch(
        `/api/questions/${id}`,
        {
            method: 'DELETE'
        }
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        const error = new Error(
            apiErrorMessage(
                data,
                'Não foi possível excluir a questão.'
            )
        );
        error.status = response.status;
        if (response.status === 401) {
            reportUnauthorized(`/api/questions/${id}`, error);
        }
        throw error;
    }

    questionsState.value = questionsState.value.filter(
        (question) => question.id !== Number(id)
    );

    return true;
};

export const useQuestionStore = () => ({
    questions: readonly(questionsState),
    getQuestion,
    saveQuestion,
    deleteQuestion,
    loadQuestions
});
