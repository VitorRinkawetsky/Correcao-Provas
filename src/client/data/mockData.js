export const users = [
    {
        id: 1,
        role: 'professor',
        fullName: 'Carlos Henrique Silva',
        email: 'carlos.silva@catolicasc.org.br',
        createdAt: '2026-08-01T10:00:00.000Z'
    },
    {
        id: 2,
        role: 'estudante',
        fullName: 'João da Silva',
        email: 'joao.silva@catolicasc.edu.br',
        registration: '20260001',
        createdAt: '2026-08-01T10:05:00.000Z'
    },
    {
        id: 3,
        role: 'estudante',
        fullName: 'Mariana Oliveira',
        email: 'mariana.oliveira@catolicasc.edu.br',
        registration: '20260002',
        createdAt: '2026-08-01T10:10:00.000Z'
    },
    {
        id: 4,
        role: 'estudante',
        fullName: 'Pedro Santos',
        email: 'pedro.santos@catolicasc.edu.br',
        registration: '20260003',
        createdAt: '2026-08-01T10:15:00.000Z'
    },
    {
        id: 5,
        role: 'estudante',
        fullName: 'Ana Souza',
        email: 'ana.souza@catolicasc.edu.br',
        registration: '20260004',
        createdAt: '2026-08-01T10:20:00.000Z'
    },
    {
        id: 6,
        role: 'estudante',
        fullName: 'Lucas Ferreira',
        email: 'lucas.ferreira@catolicasc.edu.br',
        registration: '20260005',
        createdAt: '2026-08-01T10:25:00.000Z'
    },
    {
        id: 7,
        role: 'estudante',
        fullName: 'Beatriz Almeida',
        email: 'beatriz.almeida@catolicasc.edu.br',
        registration: '20260006',
        createdAt: '2026-08-01T10:30:00.000Z'
    },
    {
        id: 8,
        role: 'estudante',
        fullName: 'Gabriel Martins',
        email: 'gabriel.martins@catolicasc.edu.br',
        registration: '20260007',
        createdAt: '2026-08-01T10:35:00.000Z'
    },
    {
        id: 9,
        role: 'estudante',
        fullName: 'Camila Rodrigues',
        email: 'camila.rodrigues@catolicasc.edu.br',
        registration: '20260008',
        createdAt: '2026-08-01T10:40:00.000Z'
    }
];

export const classes = [
    {
        id: 1,
        teacherId: 1,
        name: 'Engenharia de Software · 4ª fase',
        subject: 'Banco de Dados',
        term: '2026/2',
        status: 'active',
        inviteCode: 'BD2026A',
        studentIds: [2, 3, 4, 5, 6, 7]
    },
    {
        id: 2,
        teacherId: 1,
        name: 'Análise e Desenvolvimento de Sistemas · 3ª fase',
        subject: 'Programação Web',
        term: '2026/2',
        status: 'active',
        inviteCode: 'WEB26B',
        studentIds: [4, 5, 6, 7, 8, 9]
    }
];

export const questions = [
    {
        id: 1,
        teacherId: 1,
        type: 'objetiva',
        statement: 'Qual característica define corretamente uma chave primária em um banco de dados relacional?',
        tags: ['Banco de Dados', 'Modelagem'],
        alternatives: [
            { id: 1, text: 'Pode conter valores duplicados, desde que sejam ordenados.' },
            { id: 2, text: 'Identifica unicamente cada registro e não admite valor nulo.' },
            { id: 3, text: 'É usada apenas para armazenar dados temporários.' },
            { id: 4, text: 'Precisa ser formada por todas as colunas da tabela.' }
        ],
        correctAlternativeId: 2
    },
    {
        id: 2,
        teacherId: 1,
        type: 'objetiva',
        statement: 'Em SQL, qual cláusula é usada para filtrar grupos depois de uma operação de agregação?',
        tags: ['Banco de Dados', 'SQL'],
        alternatives: [
            { id: 5, text: 'HAVING' },
            { id: 6, text: 'ORDER BY' },
            { id: 7, text: 'WHERE' },
            { id: 8, text: 'DISTINCT' }
        ],
        correctAlternativeId: 5
    },
    {
        id: 3,
        teacherId: 1,
        type: 'objetiva',
        statement: 'Qual forma normal elimina dependências parciais de atributos não-chave em relação a uma chave composta?',
        tags: ['Banco de Dados', 'Normalização'],
        alternatives: [
            { id: 9, text: 'Primeira Forma Normal (1FN)' },
            { id: 10, text: 'Terceira Forma Normal (3FN)' },
            { id: 11, text: 'Forma Normal de Boyce-Codd (FNBC)' },
            { id: 12, text: 'Segunda Forma Normal (2FN)' }
        ],
        correctAlternativeId: 12
    },
    {
        id: 4,
        teacherId: 1,
        type: 'objetiva',
        statement: 'Qual operação de JOIN retorna somente linhas com correspondência nas duas tabelas?',
        tags: ['Banco de Dados', 'SQL'],
        alternatives: [
            { id: 13, text: 'LEFT JOIN' },
            { id: 14, text: 'FULL OUTER JOIN' },
            { id: 15, text: 'INNER JOIN' },
            { id: 16, text: 'CROSS JOIN' }
        ],
        correctAlternativeId: 15
    },
    {
        id: 5,
        teacherId: 1,
        type: 'objetiva',
        statement: 'No Scrum, quem é responsável por ordenar o Product Backlog para maximizar o valor do produto?',
        tags: ['Engenharia de Software', 'Métodos Ágeis'],
        alternatives: [
            { id: 17, text: 'Scrum Master' },
            { id: 18, text: 'Product Owner' },
            { id: 19, text: 'Patrocinador do projeto' },
            { id: 20, text: 'Equipe de infraestrutura' }
        ],
        correctAlternativeId: 18
    },
    {
        id: 6,
        teacherId: 1,
        type: 'objetiva',
        statement: 'Qual princípio SOLID recomenda que uma classe tenha apenas um motivo para mudar?',
        tags: ['Engenharia de Software', 'SOLID'],
        alternatives: [
            { id: 21, text: 'Princípio da Responsabilidade Única' },
            { id: 22, text: 'Princípio Aberto-Fechado' },
            { id: 23, text: 'Princípio da Substituição de Liskov' },
            { id: 24, text: 'Princípio da Inversão de Dependência' }
        ],
        correctAlternativeId: 21
    },
    {
        id: 7,
        teacherId: 1,
        type: 'objetiva',
        statement: 'Em JavaScript, qual declaração cria uma variável com escopo de bloco que pode receber um novo valor?',
        tags: ['Programação', 'JavaScript'],
        alternatives: [
            { id: 25, text: 'var' },
            { id: 26, text: 'const' },
            { id: 27, text: 'let' }
        ],
        correctAlternativeId: 27
    },
    {
        id: 8,
        teacherId: 1,
        type: 'objetiva',
        statement: 'Qual método HTTP é normalmente usado para substituir integralmente um recurso existente de forma idempotente?',
        tags: ['Programação Web', 'HTTP'],
        alternatives: [
            { id: 28, text: 'POST' },
            { id: 29, text: 'PATCH' },
            { id: 30, text: 'PUT' },
            { id: 31, text: 'CONNECT' }
        ],
        correctAlternativeId: 30
    },
    {
        id: 9,
        teacherId: 1,
        type: 'discursiva',
        statement: 'Explique como a normalização reduz redundâncias e anomalias de atualização em um banco de dados relacional.',
        tags: ['Banco de Dados', 'Normalização'],
        maxScore: 4
    },
    {
        id: 10,
        teacherId: 1,
        type: 'discursiva',
        statement: 'Descreva como testes automatizados apoiam a evolução segura de um sistema de software.',
        tags: ['Engenharia de Software', 'Testes'],
        maxScore: 3
    }
];

export const exams = [
    {
        id: 1,
        teacherId: 1,
        title: 'P1 - Banco de Dados',
        description: 'Primeira avaliação da disciplina de Banco de Dados.',
        questions: [
            { questionId: 1, order: 1, score: 1 },
            { questionId: 2, order: 2, score: 1 },
            { questionId: 3, order: 3, score: 1 },
            { questionId: 4, order: 4, score: 1 },
            { questionId: 5, order: 5, score: 1 },
            { questionId: 6, order: 6, score: 1 },
            { questionId: 7, order: 7, score: 1 },
            { questionId: 8, order: 8, score: 1 },
            { questionId: 9, order: 9, score: 1 },
            { questionId: 10, order: 10, score: 1 }
        ],
        status: 'ready',
        createdAt: '2026-08-10T10:00:00.000Z'
    },
    {
        id: 2,
        teacherId: 1,
        title: 'P2 - SQL',
        description: 'Segunda avaliação da disciplina de Banco de Dados, com foco em consultas SQL.',
        questions: [
            { questionId: 1, order: 1, score: 1 },
            { questionId: 2, order: 2, score: 1 },
            { questionId: 3, order: 3, score: 1 },
            { questionId: 4, order: 4, score: 1 },
            { questionId: 5, order: 5, score: 1 },
            { questionId: 6, order: 6, score: 1 },
            { questionId: 7, order: 7, score: 1 },
            { questionId: 8, order: 8, score: 1 }
        ],
        status: 'draft',
        createdAt: '2026-08-12T13:30:00.000Z'
    },
    {
        id: 3,
        teacherId: 1,
        title: 'Fundamentos de Programação Web',
        description: 'Avaliação sobre JavaScript, HTTP e integração com dados relacionais.',
        questions: [
            { questionId: 4, order: 1, score: 2 },
            { questionId: 7, order: 2, score: 2 },
            { questionId: 8, order: 3, score: 2 },
            { questionId: 10, order: 4, score: 4 }
        ],
        status: 'closed',
        createdAt: '2026-07-20T14:00:00.000Z'
    }
];

export const applications = [
    {
        id: 1,
        examId: 1,
        classId: 1,
        teacherId: 1,
        status: 'generated',
        pdfUrl: null,
        createdAt: '2026-08-15T10:00:00.000Z'
    },
    {
        id: 2,
        examId: 3,
        classId: 2,
        teacherId: 1,
        status: 'draft',
        pdfUrl: null,
        createdAt: '2026-08-16T09:00:00.000Z'
    },
    {
        id: 3,
        examId: 3,
        classId: 1,
        teacherId: 1,
        status: 'closed',
        pdfUrl: null,
        createdAt: '2026-07-25T12:00:00.000Z'
    }
];

export const examVersions = [
    {
        id: 1,
        applicationId: 1,
        versionNumber: 1,
        shuffleQuestions: true,
        shuffleAlternatives: true,
        withStudentIdentification: true,
        layout: {
            questionOrder: [3, 1, 9, 4, 2],
            alternativeOrder: [
                { questionId: 3, printedOrder: [11, 9, 12, 10] },
                { questionId: 1, printedOrder: [4, 2, 1, 3] },
                { questionId: 4, printedOrder: [14, 13, 15, 16] },
                { questionId: 2, printedOrder: [7, 8, 5, 6] }
            ]
        },
        answerKeyPublished: false,
        answerKeyPublishedAt: null,
        publicCode: 'PUB-BD01V1',
        qrCodePayload: 'MOCK-QR-VERSION-01',
        createdAt: '2026-08-15T11:00:00.000Z'
    },
    {
        id: 2,
        applicationId: 1,
        versionNumber: 2,
        shuffleQuestions: true,
        shuffleAlternatives: false,
        withStudentIdentification: true,
        layout: {
            questionOrder: [2, 4, 1, 9, 3],
            alternativeOrder: [
                { questionId: 2, printedOrder: [5, 6, 7, 8] },
                { questionId: 4, printedOrder: [13, 14, 15, 16] },
                { questionId: 1, printedOrder: [1, 2, 3, 4] },
                { questionId: 3, printedOrder: [9, 10, 11, 12] }
            ]
        },
        answerKeyPublished: false,
        answerKeyPublishedAt: null,
        publicCode: 'PUB-BD01V2',
        qrCodePayload: 'MOCK-QR-VERSION-02',
        createdAt: '2026-08-15T11:05:00.000Z'
    },
    {
        id: 3,
        applicationId: 1,
        versionNumber: 3,
        shuffleQuestions: false,
        shuffleAlternatives: true,
        withStudentIdentification: true,
        layout: {
            questionOrder: [1, 2, 3, 4, 9],
            alternativeOrder: [
                { questionId: 1, printedOrder: [3, 4, 2, 1] },
                { questionId: 2, printedOrder: [6, 5, 8, 7] },
                { questionId: 3, printedOrder: [12, 11, 10, 9] },
                { questionId: 4, printedOrder: [16, 15, 13, 14] }
            ]
        },
        answerKeyPublished: true,
        answerKeyPublishedAt: '2026-08-17T18:00:00.000Z',
        publicCode: 'PUB-BD01V3',
        qrCodePayload: 'MOCK-QR-VERSION-03',
        createdAt: '2026-08-15T11:10:00.000Z'
    },
    {
        id: 4,
        applicationId: 3,
        versionNumber: 1,
        shuffleQuestions: false,
        shuffleAlternatives: false,
        withStudentIdentification: false,
        layout: {
            questionOrder: [4, 7, 8, 10],
            alternativeOrder: [
                { questionId: 4, printedOrder: [13, 14, 15, 16] },
                { questionId: 7, printedOrder: [25, 26, 27] },
                { questionId: 8, printedOrder: [28, 29, 30, 31] }
            ]
        },
        answerKeyPublished: true,
        answerKeyPublishedAt: '2026-07-27T17:30:00.000Z',
        publicCode: 'PUB-WEB03V1',
        qrCodePayload: 'MOCK-QR-VERSION-04',
        createdAt: '2026-07-25T13:00:00.000Z'
    }
];

export const examAssignments = [
    { id: 1, examVersionId: 1, studentId: 2, qrCodePayload: 'MOCK-QR-STUDENT-01' },
    { id: 2, examVersionId: 2, studentId: 3, qrCodePayload: 'MOCK-QR-STUDENT-02' },
    { id: 3, examVersionId: 3, studentId: 4, qrCodePayload: 'MOCK-QR-STUDENT-03' },
    { id: 4, examVersionId: 1, studentId: 5, qrCodePayload: 'MOCK-QR-STUDENT-04' },
    { id: 5, examVersionId: 2, studentId: 6, qrCodePayload: 'MOCK-QR-STUDENT-05' },
    { id: 6, examVersionId: 3, studentId: 7, qrCodePayload: 'MOCK-QR-STUDENT-06' }
];

export const corrections = [
    {
        id: 1,
        examVersionId: 1,
        studentId: 2,
        objectiveResults: [
            { questionId: 1, selectedAlternativeId: 2, correct: true, score: 1.5 },
            { questionId: 2, selectedAlternativeId: 5, correct: true, score: 1.5 },
            { questionId: 3, selectedAlternativeId: 9, correct: false, score: 0 },
            { questionId: 4, selectedAlternativeId: 15, correct: true, score: 1.5 }
        ],
        discursiveScores: [{ questionId: 9, score: 3.5 }],
        totalScore: 8,
        notes: 'Boa compreensão geral. Recomenda-se revisar a Segunda Forma Normal.',
        confirmedAt: '2026-08-16T14:30:00.000Z',
        correctedBy: 1,
        isAutomaticallyAssigned: true,
        syncStatus: 'synced'
    },
    {
        id: 2,
        examVersionId: 2,
        studentId: 3,
        objectiveResults: [
            { questionId: 1, selectedAlternativeId: 2, correct: true, score: 1.5 },
            { questionId: 2, selectedAlternativeId: 5, correct: true, score: 1.5 },
            { questionId: 3, selectedAlternativeId: 9, correct: false, score: 0 },
            { questionId: 4, selectedAlternativeId: 15, correct: true, score: 1.5 }
        ],
        discursiveScores: [{ questionId: 9, score: 3.8 }],
        totalScore: 8.3,
        notes: null,
        confirmedAt: '2026-08-16T15:10:00.000Z',
        correctedBy: 1,
        isAutomaticallyAssigned: true,
        syncStatus: 'synced'
    },
    {
        id: 3,
        examVersionId: 3,
        studentId: 4,
        objectiveResults: [
            { questionId: 1, selectedAlternativeId: 1, correct: false, score: 0 },
            { questionId: 2, selectedAlternativeId: 5, correct: true, score: 1.5 },
            { questionId: 3, selectedAlternativeId: 12, correct: true, score: 1.5 },
            { questionId: 4, selectedAlternativeId: 15, correct: true, score: 1.5 }
        ],
        discursiveScores: [{ questionId: 9, score: 2 }],
        totalScore: 6.5,
        notes: 'A resposta discursiva precisa relacionar melhor redundância e anomalias de atualização.',
        confirmedAt: '2026-08-16T15:45:00.000Z',
        correctedBy: 1,
        isAutomaticallyAssigned: true,
        syncStatus: 'synced'
    },
    {
        id: 4,
        examVersionId: 4,
        studentId: null,
        reportedStudentName: 'Pedro Santos',
        reportedStudentRegistration: '20260003',
        objectiveResults: [
            { questionId: 4, selectedAlternativeId: 15, correct: true, score: 2 },
            { questionId: 7, selectedAlternativeId: 27, correct: true, score: 2 },
            { questionId: 8, selectedAlternativeId: 28, correct: false, score: 0 }
        ],
        discursiveScores: [{ questionId: 10, score: 2.5 }],
        totalScore: 6.5,
        notes: 'Aguardando associação manual com um estudante da turma.',
        confirmedAt: '2026-07-27T16:20:00.000Z',
        correctedBy: 1,
        isAutomaticallyAssigned: false,
        syncStatus: 'pending'
    }
];

export const statusLabels = {
    ready: 'Pronta',
    draft: 'Rascunho',
    closed: 'Encerrada',
    generated: 'PDF gerado',
    active: 'Ativa',
    archived: 'Arquivada',
    synced: 'Sincronizada',
    pending: 'Pendente',
    error: 'Erro'
};

export const statusTones = {
    ready: 'success',
    generated: 'success',
    active: 'success',
    synced: 'success',
    draft: 'neutral',
    pending: 'warning',
    error: 'danger',
    closed: 'muted',
    archived: 'muted'
};

export const getUserById = (id) => users.find((user) => user.id === Number(id));
export const getClassById = (id) => classes.find((item) => item.id === Number(id));
export const getQuestionById = (id) => questions.find((question) => question.id === Number(id));
export const getExamById = (id) => exams.find((exam) => exam.id === Number(id));
export const getApplicationById = (id) => applications.find((application) => application.id === Number(id));

export const getStudentsByClassId = (classId) => {
    const classItem = getClassById(classId);
    return classItem
        ? classItem.studentIds.map(getUserById).filter((user) => user?.role === 'estudante')
        : [];
};

export const getExamQuestions = (examId) => {
    const exam = getExamById(examId);
    if (!exam) return [];

    return exam.questions
        .map(({ questionId, order, score }) => {
            const question = getQuestionById(questionId);
            return question ? { ...question, order, score } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.order - b.order);
};

export const getExamDetails = (examId) => {
    const exam = getExamById(examId);
    if (!exam) return null;
    const examQuestions = getExamQuestions(examId);
    return {
        ...exam,
        questions: examQuestions,
        questionCount: examQuestions.length,
        totalScore: examQuestions.reduce((total, question) => total + question.score, 0)
    };
};

export const getAllExams = () => exams.map((exam) => getExamDetails(exam.id));

export const getApplicationsByExamId = (examId) => applications.filter((item) => item.examId === Number(examId));
export const getApplicationsByClassId = (classId) => applications.filter((item) => item.classId === Number(classId));
export const getVersionsByApplicationId = (applicationId) => examVersions.filter((item) => item.applicationId === Number(applicationId));
export const getAssignmentsByVersionId = (versionId) => examAssignments.filter((item) => item.examVersionId === Number(versionId));

export const getCorrectionsByApplicationId = (applicationId) => {
    const versionIds = new Set(getVersionsByApplicationId(applicationId).map((version) => version.id));
    return corrections.filter((correction) => versionIds.has(correction.examVersionId));
};

export const getApplicationDetails = (applicationId) => {
    const application = getApplicationById(applicationId);
    if (!application) return null;
    return {
        ...application,
        exam: getExamDetails(application.examId),
        classItem: getClassById(application.classId),
        versions: getVersionsByApplicationId(application.id),
        corrections: getCorrectionsByApplicationId(application.id)
    };
};

export const formatScore = (value) => Number(value || 0).toFixed(1);
export const formatDate = (value) => new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
}).format(new Date(value));

export const getStudentGradeRows = (studentId) => corrections
    .filter((correction) => correction.studentId === Number(studentId))
    .map((correction) => {
        const version = examVersions.find((item) => item.id === correction.examVersionId);
        const application = version ? getApplicationById(version.applicationId) : null;
        const exam = application ? getExamById(application.examId) : null;
        const classItem = application ? getClassById(application.classId) : null;
        const total = exam ? getExamDetails(exam.id).totalScore : 10;
        return {
            correction,
            version,
            application,
            exam,
            classItem,
            total,
            percent: Math.round((correction.totalScore / total) * 100)
        };
    });
