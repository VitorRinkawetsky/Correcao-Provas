# Projeto Correção de Prova

## 1. Identificação dos Integrantes

| Nome completo | Responsabilidade inicial (conforme tarefas delegadas) |
|---|---|
| Vitor Augusto Rinkawetsky | Setup inicial do projeto (Express, MySQL, estrutura em camadas), dados mockados compartilhados, telas de Autenticação (login/cadastro) e Dashboard do Professor, Gabarito, Correções, Relatórios, revisão final de navegação e padronização visual |
| Gustavo Gorges Koch | Módulo de Turmas (listagem, criação/edição, detalhes da turma) |
| Ana Clara Tomaselli Borchardt | Módulo de Questões (banco de questões, criação/edição de questões objetivas e discursivas) |
| Weliton Rodrigues | Módulo de Provas (listagem, criação/edição, seleção de questões, detalhes da prova) |
| Laura Beatriz Poffo Donath | Módulo de Aplicações (listagem, criação, detalhes, configuração de geração e versões em PDF) |

## 2. Escopo do Projeto

**O que o sistema fará:**
Um sistema de apoio à correção de provas, permitindo que professores criem questões e provas, apliquem essas provas a turmas, gerem versões em PDF (com embaralhamento de questões/alternativas), publiquem gabaritos, corrijam as provas aplicadas e acompanhem o desempenho dos alunos por meio de relatórios. Os alunos, por sua vez, acompanham suas próprias provas e notas.

**Funcionalidades dentro do escopo:**
- Login e cadastro de usuários, com distinção entre Professor e Aluno
- Gerenciamento de turmas (criar, editar, listar, ver detalhes, código de convite, gerenciamento de alunos da turma)
- Banco de questões, com criação/edição de questões objetivas e discursivas, filtro por tipo, tags e texto
- Criação e edição de provas, com seleção de questões e definição de pontuação e ordem
- Aplicação de provas a turmas específicas
- Geração de múltiplas versões da prova (com embaralhamento de questões/alternativas) e opção de identificação
- Gerenciamento e publicação de gabaritos por versão
- Correção de provas, incluindo o fluxo de associação manual de provas sem identificação a um aluno
- Relatórios de desempenho (média, mediana, desvio padrão) com filtros por turma, disciplina e período
- Área do aluno: dashboard, minhas provas e histórico de notas

**Fora do escopo (nesta etapa – N1):**
- Persistência real dos dados em MySQL (as telas usam dados mockados/estáticos)
- Geração real de arquivos PDF (o botão apenas simula a geração)
- Autenticação real com backend (o login apenas redireciona para o dashboard)
- Exportação real de relatórios em Excel/CSV/PDF

**Principais usuários do sistema:**
- Professores (criam turmas, questões, provas, aplicações, corrigem e publicam gabaritos)
- Alunos (acompanham provas aplicadas e suas notas)

**Principais telas previstas:**
- Login e Cadastro
- Dashboard do Professor
- Turmas (listagem, criação/edição, detalhes)
- Banco de Questões (listagem, criação/edição objetiva e discursiva)
- Provas (listagem, criação/edição, seleção de questões, detalhes)
- Aplicações (listagem, criação, detalhes, configuração de geração, versões geradas)
- Gabarito e Correções (correções, correções sem aluno, detalhes de uma correção)
- Relatórios
- Área do Aluno (dashboard, minhas provas, histórico e detalhes de notas)

## 3. Objetivo

**Problema:** professores gastam muito tempo e esforço no processo manual de criar, aplicar e corrigir provas, especialmente ao lidar com múltiplas versões de uma mesma prova, embaralhamento de questões e correção de provas sem identificação clara do aluno.

**Propósito:** oferecer aos professores uma ferramenta que organize todo o ciclo de uma prova — da criação das questões até a correção e geração de relatórios de desempenho — reduzindo o trabalho manual e centralizando as informações de turmas, provas e notas. Para os alunos, oferecer visibilidade sobre suas provas e seu histórico de desempenho.

**Objetivo geral:** desenvolver um sistema web que apoie professores no gerenciamento completo de turmas, questões, provas, aplicações e correções, e que permita aos alunos acompanhar suas notas e provas realizadas.

## 4. Principais Requisitos

### Requisitos Funcionais (RF)

- **RF01** – O sistema deverá permitir o cadastro de usuários, distinguindo entre Professor e Aluno.
- **RF02** – O sistema deverá permitir realizar login.
- **RF03** – O sistema deverá permitir o gerenciamento de turmas (criação, edição, listagem e visualização de detalhes, incluindo código de convite e alunos vinculados).
- **RF04** – O sistema deverá permitir o gerenciamento de um banco de questões, com criação/edição de questões objetivas e discursivas, e filtro por tipo, tags e texto.
- **RF05** – O sistema deverá permitir a criação e edição de provas, com seleção de questões, definição de pontuação e ordenação.
- **RF06** – O sistema deverá permitir a aplicação de uma prova a uma turma específica.
- **RF07** – O sistema deverá permitir configurar a geração de múltiplas versões de uma prova, com opções de embaralhamento de questões/alternativas e identificação.
- **RF08** – O sistema deverá permitir o gerenciamento e a publicação de gabaritos por versão da prova.
- **RF09** – O sistema deverá permitir a correção das provas aplicadas, incluindo a associação manual de provas sem identificação a um aluno.
- **RF10** – O sistema deverá permitir a geração de relatórios de desempenho (média, mediana, desvio padrão), com filtros por turma, disciplina e período.
- **RF11** – O sistema deverá disponibilizar uma área do aluno com dashboard, lista de provas realizadas e histórico de notas.

> *Observação: na N1, todas as telas utilizam dados estáticos/mock; a persistência real em MySQL, a geração real de PDF e a autenticação real entram na N2.*

### Requisitos Não Funcionais (RNF)

- **RNF01** – O sistema deverá possuir interface responsiva.
- **RNF02** – O backend deverá seguir arquitetura em camadas (routes → controllers → services → repositories) sobre Express e MySQL.
- **RNF03** – O frontend deverá utilizar componentes reutilizáveis (navbar, footer, cards) e dados mockados compartilhados entre as telas, evitando duplicação de código.
- **RNF04** – O projeto deverá ser configurado desde o início para que qualquer integrante consiga clonar e rodar o ambiente (`.env.example`, script `npm run dev`, `.gitignore`, README inicial).
- **RNF05** – Todas as páginas deverão manter padronização visual (mesmos botões, tabelas, inputs, espaçamentos, cores e cards).
- **RNF06** – O fluxo de navegação entre as telas deverá ser revisado e validado antes da entrega, sem links quebrados ou páginas inacessíveis.
- **RNF07** – O desenvolvimento deverá utilizar Git/GitHub com commits organizados por tarefa.
