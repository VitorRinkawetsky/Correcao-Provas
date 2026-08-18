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
                {
                    questionId: 3,
                    printedOrder: [11, 9, 12, 10]
                },
                {
                    questionId: 1,
                    printedOrder: [4, 2, 1, 3]
                },
                {
                    questionId: 4,
                    printedOrder: [14, 13, 15, 16]
                },
                {
                    questionId: 2,
                    printedOrder: [7, 8, 5, 6]
                }
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
                {
                    questionId: 2,
                    printedOrder: [5, 6, 7, 8]
                },
                {
                    questionId: 4,
                    printedOrder: [13, 14, 15, 16]
                },
                {
                    questionId: 1,
                    printedOrder: [1, 2, 3, 4]
                },
                {
                    questionId: 3,
                    printedOrder: [9, 10, 11, 12]
                }
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
                {
                    questionId: 1,
                    printedOrder: [3, 4, 2, 1]
                },
                {
                    questionId: 2,
                    printedOrder: [6, 5, 8, 7]
                },
                {
                    questionId: 3,
                    printedOrder: [12, 11, 10, 9]
                },
                {
                    questionId: 4,
                    printedOrder: [16, 15, 13, 14]
                }
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
                {
                    questionId: 4,
                    printedOrder: [13, 14, 15, 16]
                },
                {
                    questionId: 7,
                    printedOrder: [25, 26, 27]
                },
                {
                    questionId: 8,
                    printedOrder: [28, 29, 30, 31]
                }
            ]
        },
        answerKeyPublished: true,
        answerKeyPublishedAt: '2026-07-27T17:30:00.000Z',
        publicCode: 'PUB-WEB03V1',
        qrCodePayload: 'MOCK-QR-VERSION-04',
        createdAt: '2026-07-25T13:00:00.000Z'
    }
];
