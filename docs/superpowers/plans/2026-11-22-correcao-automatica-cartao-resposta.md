# Correção automática por cartão-resposta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fotografar um cartão-resposta no navegador, ler QR e marcações automaticamente, revisar respostas e salvar a nota pelo fluxo existente.

**Architecture:** Um módulo compartilhado define a geometria normalizada usada pelo cartão imprimível e pelo leitor. Um serviço puro executa qualidade, binarização, marcadores, homografia e classificação; `CorrecaoView` apenas coordena APIs do navegador, contexto QR, revisão e POST existente.

**Tech Stack:** Vue 3, Canvas 2D, BarcodeDetector, getUserMedia, JavaScript, Vitest e Vue Test Utils.

**Spec:** `docs/superpowers/specs/2026-11-22-correcao-automatica-cartao-resposta-design.md`

## Global Constraints

- Não enviar, persistir ou registrar a foto.
- Não executar banco local, Docker, migrations ou testes MySQL.
- Preservar entrada manual de QR e marcação manual de respostas.
- Servidor continua sendo a autoridade da nota em `POST /api/corrections`.
- Layout canônico: 1000 × 1414 px, quatro marcadores, 1–20 questões e 2–5 alternativas.
- Erro de captura deve orientar o professor a refazer a foto sem apagar respostas anteriores.

## Review Focus

- Foto cortada ou sem quatro marcadores não pode preencher respostas parcialmente.
- Rasura com duas alternativas deve ficar amarela e sem seleção automática.
- Navegador sem `BarcodeDetector` deve aceitar código manual + foto.
- Alternativas devem ser mapeadas pela ordem impressa retornada no contexto, nunca pelo ID ou gabarito.
- Trocar uma resposta manualmente depois da leitura deve prevalecer no payload salvo.

---

### Task 1: Contrato de layout e leitor puro

**Files:**
- Create: `src/shared/answerSheetLayout.js`
- Create: `src/client/services/answerSheetReader.js`
- Create: `src/client/services/answerSheetReader.test.js`

**Interfaces:**
- Produces: `getAnswerSheetGeometry(questionCounts)`, `recognizeAnswerSheet(imageData, questions, options)` e funções puras auxiliares exportadas para testes.
- Recognition returns: `{ alignedImageData, markers, questions: [{ questionId, status, selectedIndex, ratios }] }`.

- [ ] Escrever testes RED para limites do layout, cartões sintéticos de 5/20 questões, branco, rasura e foto sem marcadores.
- [ ] Rodar `npx vitest run src/client/services/answerSheetReader.test.js` e confirmar falha por módulos ausentes.
- [ ] Implementar layout, qualidade, limiar adaptativo, componentes de canto, homografia e leitura de bolhas.
- [ ] Rodar o teste focado até ficar verde.

### Task 2: Cartão imprimível com o layout compartilhado

**Files:**
- Create: `src/client/components/AnswerSheetPrint.vue`
- Create: `src/client/components/AnswerSheetPrint.test.js`
- Modify: `src/client/views/AplicacaoVersoesView.vue`
- Modify: `src/services/applicationVersionsService.js`
- Modify: `src/services/applicationVersionsService.test.js`

**Interfaces:**
- Service adds: `questions[].alternativeCount` no gabarito da versão.
- Component consumes: QR data URL, aluno/versão e `[{ order, alternativeCount }]`.

- [ ] Escrever testes RED para `alternativeCount` e para marcadores/bolhas renderizados pelo componente.
- [ ] Implementar o campo sem mudar a query ou revelar informação adicional de correção.
- [ ] Implementar componente e ação de abrir/imprimir cartão em `AplicacaoVersoesView`.
- [ ] Rodar os testes focados até ficarem verdes.

### Task 3: Captura, QR, revisão e salvamento

**Files:**
- Create: `src/client/services/answerSheetCapture.js`
- Create: `src/client/services/answerSheetCapture.test.js`
- Modify: `src/client/views/CorrecaoView.vue`
- Modify: `src/client/views/CorrecaoView.test.js`

**Interfaces:**
- Produces: `detectQrCode(source)`, `sourceToImageData(source)` e `drawRecognitionPreview(canvas, recognition)`.
- Consumes Task 1 recognition; maps `selectedIndex` to `context.questions[n].alternatives[selectedIndex].id`.

- [ ] Escrever testes RED de detecção QR e do upload que preenche respostas reais da versão.
- [ ] Implementar APIs de captura sem retenção ou upload da foto.
- [ ] Integrar abrir/capturar câmera, upload, processamento, preview, estados de revisão e nota salva.
- [ ] Provar em teste que o payload automático e a correção manual usam o POST existente.

### Task 4: Verificação sem banco e documentação

**Files:**
- Modify: `README.md`

**Interfaces:**
- Documents: layout, compatibilidade, privacidade, fallback e roteiro de calibração publicado.

- [ ] Atualizar o README com uso e limitações da correção automática.
- [ ] Rodar apenas testes unitários/client focados que não acessam banco.
- [ ] Rodar `npm run build`.
- [ ] Registrar que 15 fotos reais e Android/HTTPS exigem validação no site publicado e não foram simulados localmente.
