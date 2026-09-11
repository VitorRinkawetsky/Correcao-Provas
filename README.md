# SGP Católica

Front-end do Sistema de Gestão de Provas, migrado do HTML/JavaScript original para Vue 3. O projeto reúne as telas iniciais de provas e o gerenciamento de questões objetivas em uma identidade visual responsiva.

## Escopo de telas

| Rota Vue | Tela original | Conteúdo |
| --- | --- | --- |
| `/` | `public/index.html` | Página inicial |
| `/provas/:id` | `public/pages/prova-detalhes.html?id=...` | Informações, ações e questões da prova |
| `/questoes` | `public/pages/questoes.html` | Pesquisa, filtro, edição e exclusão de questões objetivas |
| `/questoes/nova` | `public/pages/questao-form.html` | Criação de questão objetiva |
| `/questoes/:id/editar` | `public/pages/questao-form.html?id=...` | Edição de questão objetiva |

As URLs legadas `/index.html`, `/pages/prova-detalhes.html?id=...`, `/pages/questoes.html` e `/pages/questao-form.html?id=...` continuam funcionando por redirecionamento.

> Regra de escopo: não crie login, cadastro, listagens, relatórios, perfis ou outras telas sem uma solicitação explícita. Links que existiam na navegação antiga não contam como telas implementadas. Documentos de requisitos são referência de domínio, não autorização para ampliar o front-end.

## Tecnologias

- Vue 3 com Composition API e Single-File Components;
- Vue Router em History Mode;
- Vite para desenvolvimento e build;
- Express para servir o build e aplicar o fallback da SPA;
- Lucide Vue para ícones;
- Vitest para os contratos dos dados usados pelas telas.

## Como executar

```bash
npm install
npm run dev
```

O endereço padrão é `http://127.0.0.1:5173`.

Para validar e executar o build de produção:

```bash
npm run test
npm run build
npm start
```

O Express serve a pasta `dist` na porta informada por `PORT` ou, por padrão, na porta `3000`.

## Estrutura do front-end

```text
src/client/
├── components/
│   ├── layout/AppShell.vue
│   └── ui/StatusBadge.vue
├── data/
│   ├── mockData.js
│   ├── mockData.test.js
│   ├── questionStore.js
│   └── questionStore.test.js
├── router/index.js
├── styles/
│   ├── main.css
│   └── tokens.css
├── views/
│   ├── HomeView.vue
│   ├── ExamDetailsView.vue
│   ├── QuestionBank.vue
│   └── QuestionFormView.vue
├── App.vue
└── main.js
```

Os mocks originais foram consolidados em `mockData.js`. A interface usa interpolação do Vue e não injeta conteúdo com `innerHTML` ou `v-html`.

## Guia de estilo para futuras alterações

Esta seção deve ser seguida em outros chats e futuras implementações para que o site permaneça visualmente consistente.

### Direção visual

- A aparência é acadêmica, sóbria e acolhedora.
- Verde-petróleo é a cor de identidade; fundos são claros e superfícies são brancas.
- A hierarquia vem primeiro de tipografia e espaço. Bordas e sombras devem continuar discretas.
- Cada agrupamento deve ter no máximo uma ação primária.
- Evite gradientes fortes, neon, glassmorphism excessivo, animações longas e decoração genérica.

### Tokens

Use sempre `src/client/styles/tokens.css` como fonte de verdade. Antes de escrever uma cor, espaçamento, raio ou sombra diretamente em um componente, confira se já existe um token adequado.

| Papel | Token principal | Valor atual |
| --- | --- | --- |
| Identidade | `--color-brand-700` | `#146f63` |
| Identidade escura | `--color-brand-950` | `#102f2c` |
| Fundo | `--color-bg` | `#f4f7f6` |
| Superfície | `--color-surface` | `#ffffff` |
| Títulos | `--color-heading` | `#182724` |
| Texto secundário | `--color-muted` | `#6b7975` |
| Bordas | `--color-border` | `#dce4e1` |

- Espaçamento usa a escala `--space-1` a `--space-12`, baseada em múltiplos de 4 px.
- Cards usam preferencialmente `--radius-lg` ou `--radius-xl`.
- Controles usam `--radius-md` e altura mínima de 44 px.
- A sombra comum é `--shadow-sm`; reserve `--shadow-md` para destaques.

### Tipografia e conteúdo

- Use a pilha `--font-sans`; não adicione fonte remota sem decisão explícita.
- Títulos têm entrelinha curta, peso forte e espaçamento entre letras levemente negativo.
- Textos e rótulos devem estar em português do Brasil, com frases curtas e verbos diretos.
- O texto “Página inicial” e a confirmação “Projeto funcionando!” pertencem à Home original e devem ser preservados enquanto seu conteúdo não for redesenhado por solicitação.

### Componentes e navegação

- Reuse `AppShell` nas telas e `StatusBadge` para estados da prova.
- Use ícones de `@lucide/vue`, normalmente entre 16 e 24 px; não desenhe SVG manual nas views.
- Botão primário: verde sólido e texto branco. Botão secundário: superfície branca com borda leve.
- Cards devem ter título curto, conteúdo objetivo e uma única finalidade.
- A navegação principal expõe Home, Detalhes da prova e Banco de questões.
- Não transforme os botões Editar, Criar aplicação e Arquivar em novas rotas até que as respectivas telas sejam solicitadas.

### Responsividade e acessibilidade

- O conteúdo tem largura máxima de `1120px` e margens laterais fluidas.
- Em telas pequenas, a navegação reduz os rótulos, ações podem quebrar linha e cards reorganizam suas colunas.
- Teste desde 320 px e nunca esconda conteúdo essencial apenas para fazê-lo caber.
- Todo controle precisa de nome acessível e foco visível.
- Prefira elementos nativos (`button`, `a`, `nav`, `main`, `article`) e mantenha áreas clicáveis próximas de 44 px.
- Texto ou ícone deve acompanhar qualquer estado comunicado por cor.

### Checklist antes de entregar

1. Confirme que a mudança não criou uma tela fora do escopo solicitado.
2. Reuse os tokens e componentes existentes antes de criar variações.
3. Preserve as duas URLs legadas.
4. Verifique Home e Detalhes da prova em desktop e mobile.
5. Execute `npm run test` e `npm run build`.

## Estado das ações

Os botões da tela de detalhes foram preservados como no front original, mas ainda não persistem nem navegam para novas páginas. A integração com uma API poderá ser adicionada depois sem alterar o escopo atual de telas.
