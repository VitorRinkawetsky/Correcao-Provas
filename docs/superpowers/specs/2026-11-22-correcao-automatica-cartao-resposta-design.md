# Correção automática por cartão-resposta — desenho

## Intenção

Permitir que o professor fotografe o cartão-resposta no celular e receba as respostas preenchidas automaticamente para revisão e salvamento. O QR Code identifica aluno e versão; a foto nunca sai do navegador; o servidor continua sendo a autoridade para calcular e persistir a nota.

## Objetivos

- Capturar uma foto pela câmera traseira ou selecionar uma foto do aparelho.
- Ler o QR Code e consultar o contrato existente `GET /api/corrections/context?code=...`.
- Detectar quatro marcadores, corrigir perspectiva e ler até 20 linhas com até cinco alternativas.
- Preencher o formulário atual, destacar leituras seguras e dúvidas e permitir correção manual antes do envio.
- Mostrar a nota retornada por `POST /api/corrections` em destaque.
- Manter integralmente a entrada manual do QR e das respostas.
- Disponibilizar um cartão imprimível que consuma o mesmo arquivo de medidas usado pelo leitor.

## Restrições e não objetivos

- Toda visão computacional roda no navegador com Canvas; não será adicionada dependência OpenCV nem endpoint de imagem.
- A foto existe somente em memória durante captura e revisão e não entra em payload, armazenamento local ou logs.
- O fluxo depende de HTTPS e de `BarcodeDetector` para ler o QR automaticamente. Sem ele, o professor informa o código e ainda pode processar a foto.
- A entrega não executa MySQL, Docker, migrations ou testes que abram conexão com banco.
- A validação automatizada usa cartões sintéticos determinísticos. As 15 fotos reais e a meta de erro abaixo de 1% continuam sendo uma etapa de calibração no site publicado e em aparelho Android.

## Abordagens consideradas

1. **OpenCV.js:** oferece transformação de perspectiva pronta, mas aumenta bastante o download inicial e a complexidade de carregamento no celular.
2. **Canvas e homografia própria (escolhida):** mantém o bundle pequeno, deixa o algoritmo unitariamente testável e cobre o recorte geométrico necessário para um layout conhecido.
3. **Enviar a foto ao servidor:** simplificaria compatibilidade de navegador, mas viola a restrição de privacidade e criaria um serviço de visão fora do escopo.

## Contrato do cartão

`src/shared/answerSheetLayout.js` é a única fonte das dimensões. A página normalizada mede 1000 × 1414 px, tem quatro marcadores pretos quadrados, região reservada ao QR e uma grade de uma linha por questão e uma coluna por letra. O componente de impressão e o leitor importam as mesmas funções de geometria.

O contrato suporta de 1 a 20 questões e de 2 a 5 alternativas. Um gerador futuro de PDF deve importar esse módulo em vez de duplicar medidas.

## Leitura

1. Reduzir a foto para uma resolução segura para celular e convertê-la em tons de cinza.
2. Rejeitar imagens sem contraste, excessivamente escuras/claras ou sem bordas nítidas.
3. Binarizar por média local com imagem integral.
4. Procurar, em cada canto, o maior componente escuro aproximadamente quadrado e preenchido.
5. Resolver uma homografia dos centros encontrados para os centros canônicos e gerar a página 1000 × 1414.
6. Medir a proporção escura no interior de cada bolha, evitando a borda impressa.
7. Classificar a linha como marcada, em branco ou duvidosa. Uma marca exige proporção mínima de 38% e vantagem de 12 pontos percentuais; duas marcas acima do limiar são duvidosas.

## Interface e erros

A tela oferece `Abrir câmera`, `Capturar cartão` e `Enviar foto`. Depois da leitura, mostra a imagem alinhada com sobreposição verde para marca segura e amarela para dúvida. O formulário abaixo continua editável; alterar uma rádio transforma a questão em revisada.

Falha de qualidade, corte, ausência de marcadores ou QR sem contexto gera mensagem para refazer a foto e não altera as respostas existentes. Permissão negada mantém upload e fluxo manual disponíveis.

## Testes e aceite

- Testes unitários exercitam geometria, limiar adaptativo, marcadores, homografia, marca única, branco e rasura em imagens sintéticas de 5 e 20 questões.
- Teste de componente prova que uma foto lida preenche IDs de alternativas e que o mesmo POST atual é enviado.
- Teste do serviço de versões prova que o gerador recebe a quantidade real de alternativas sem expor qual é a correta além do contrato atual de gabarito.
- Build Vite e testes focados de frontend/service devem passar sem banco.
- Aceite final de produção: Android + HTTPS + pelo menos 15 fotos reais nas condições descritas, realizado no site publicado.
