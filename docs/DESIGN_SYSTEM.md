# DESIGN SYSTEM — UniAnchieta · Centro de Sucesso ao Aluno

> **Documento portátil.** Descreve, com valores exatos extraídos do código, o sistema visual do
> `sucesso-ao-aluno`. Qualquer sistema novo que copie os tokens, a tipografia, o motion spec e os
> primitivos deste arquivo sai visualmente idêntico — sem precisar olhar este repositório.
>
> **Repositório de origem:** https://github.com/victorpansonato-design/sucesso-ao-aluno
> **Versão:** 2.0.0 · **Stack:** React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS 4 + motion/react 12 + lucide-react

---

## 0. Índice

1. [As cinco regras](#1-as-cinco-regras)
2. [Stack e dependências exatas](#2-stack-e-dependências-exatas)
3. [Tokens de cor — light e dark completos](#3-tokens-de-cor--light-e-dark-completos)
4. [Ponte Tailwind (`@theme inline`)](#4-ponte-tailwind-theme-inline)
5. [Tipografia](#5-tipografia)
6. [Forma: raios, sombras, espaçamento](#6-forma-raios-sombras-espaçamento)
7. [Camada base e utilitários](#7-camada-base-e-utilitários)
8. [Motion spec](#8-motion-spec)
9. [Layout do shell](#9-layout-do-shell)
10. [Componentes — API e classes exatas](#10-componentes--api-e-classes-exatas)
11. [Visualização de dados](#11-visualização-de-dados)
12. [Vocabulário de status](#12-vocabulário-de-status)
13. [Acessibilidade](#13-acessibilidade)
14. [Anti-padrões (zero "AI slop")](#14-anti-padrões-zero-ai-slop)
15. [Boilerplate: começar um sistema novo](#15-boilerplate-começar-um-sistema-novo)
16. [Checklist de revisão](#16-checklist-de-revisão)
17. [Skills e referências](#17-skills-e-referências)

---

## 1. As cinco regras

Toda decisão visual do sistema decorre destas cinco. Se uma escolha nova não puder ser justificada
por uma delas, ela não entra.

### Regra 1 — Separação é contraste, não linha

Um card é uma **superfície mais clara sobre um canvas mais escuro**. Não existe borda em volta de
caixa. Uma tela com quarenta retângulos de 1px lidos como moldura vira wireframe, não software — o
olho tem de decodificar a moldura antes de ler o conteúdo.

```tsx
/* ✅ */ <div className="rounded-xl bg-surface p-5">
/* ❌ */ <div className="rounded-xl border border-hairline bg-surface p-5 shadow-sm">
```

### Regra 2 — Hairline é divisor, nunca moldura

`--hairline` existe para **separar linhas de uma lista** e **seções de um card**. Ele nunca fecha uma
forma.

```tsx
/* ✅ */ <div className="divide-y divide-hairline">…</div>
/* ✅ */ <footer className="border-t border-hairline pt-2.5">…</footer>
/* ❌ */ <div className="border border-hairline">…</div>
```

### Regra 3 — Um raio de superfície (12px) e uma pílula

Seis raios eram seis decisões que ninguém lembrava. Agora **a silhueta diz o que a coisa é**:

| Forma | Raio | Significa |
|---|---|---|
| Retângulo 12px | `rounded-xl` / `rounded-lg` / `rounded-md` (todos = 12px) | é um **lugar** (card, painel, modal) |
| Pílula | `rounded-full` | é uma **ação** (botão, chip, segmented) |
| 6–8px | `rounded-xs` / `rounded-sm` | chip inline e controle que ficaria absurdo em 12px |

Por isso um botão **não precisa de contorno** para ser lido como botão.

### Regra 4 — Cor é conquistada

Estrutura é monocromática. O azul institucional aparece em **exatamente três lugares**:

1. o botão primário,
2. o item de menu ativo,
3. o arco principal do donut.

Vermelho é reservado para **SLA estourado** e **caso crítico**. Âmbar para "atenção". Todo o resto é
tinta (`--ink`, `--ink-2`, `--ink-3`, `--ink-4`).

### Regra 5 — Sem sombra no que não flutua

`--shadow-raised: none`. Nada na página está flutuando — está diagramado. **Só overlays** (modal,
drawer, popover, toast), que genuinamente estão acima do app, projetam `--shadow-overlay`.

---

## 2. Stack e dependências exatas

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --port=3000",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.14",
    "@types/node": "^22.14.0",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.4",
    "@vitejs/plugin-react": "^5.0.4",
    "tailwindcss": "^4.1.14",
    "typescript": "~5.8.2",
    "vite": "^6.2.3"
  }
}
```

**Regras de stack:**

- Tailwind **v4** via plugin Vite (`@tailwindcss/vite`) — **sem** `tailwind.config.js`. Os tokens vivem
  em CSS puro dentro de `@theme inline`.
- `motion/react` (o pacote `motion`, não `framer-motion`).
- **Ícones: exclusivamente `lucide-react`**, sempre em `h-3 w-3`, `h-3.5 w-3.5`, `h-4 w-4` ou `h-5 w-5`.
  Nunca emoji na UI. Nunca outra biblioteca de ícones misturada.
- Nenhuma biblioteca de gráficos. Os charts são SVG próprio (ver §11).
- Nenhum componente de UI de terceiros. Os primitivos são os deste documento.

---

## 3. Tokens de cor — light e dark completos

**Contrato inegociável:** nenhum componente escreve hex. Toda cor resolve por um token semântico, e o
dark mode é uma **troca de tokens**, não um segundo conjunto de classes.

O tema é **opt-in por classe** (`.dark` no `<html>`), nunca herdado do SO. Light é o padrão.

```css
@import 'tailwindcss';

@custom-variant dark (&:where(.dark, .dark *));

:root {
  /* -- Superfícies: a hierarquia visual inteira, feita de quatro cinzas ---- */
  --canvas: #f3f4f6;
  --canvas-subtle: #eef0f2;
  --surface: #ffffff;
  --surface-2: #eef0f2;
  --surface-3: #e6e8eb;
  --surface-hover: #f3f4f6;

  /* -- Divisores (nunca molduras) ----------------------------------------- */
  --hairline: #e6e8eb;
  --hairline-strong: #d8dbe0;

  /* -- Escada de texto ---------------------------------------------------- */
  --ink: #101317;
  --ink-2: #414852;
  --ink-3: #6b7280;
  --ink-4: #9aa1ac;

  /* -- Marca: cirúrgica. Botão primário, nav ativo, arco do donut. -------- */
  --brand: #00509d;
  --brand-hover: #003f7d;
  --brand-2: #00509d;
  --brand-3: #0f6fc4;
  --brand-soft: #e8eef5;
  --brand-soft-2: #dce7f1;
  --brand-border: #e8eef5;
  --brand-text: #00457f;
  --on-brand: #ffffff;
  /* Azul do wordmark registrado — nunca re-tingido. */
  --brand-mark: #1567b8;

  /* -- Superfície de ênfase: um passo de contraste, sem matiz, sem grid --- */
  --band: #eef0f2;
  --band-2: #e6e8eb;
  --band-ink: #101317;
  --band-ink-2: #6b7280;
  --band-ink-3: #9aa1ac;
  --band-line: #e6e8eb;
  --band-inset: #ffffff;

  /* -- Status: cinza → âmbar → âmbar → vermelho. Um vermelho, no fim. ----- */
  --ok: #6b7280;
  --ok-ink: #414852;
  --ok-soft: #eef0f2;
  --ok-border: #e6e8eb;
  --warn: #9a7128;
  --warn-ink: #7d5c1f;
  --warn-soft: #f5f1e8;
  --warn-border: #ece3d1;
  --risk: #a15c07;
  --risk-ink: #874d05;
  --risk-soft: #f6f0e7;
  --risk-border: #eddfc9;
  --crit: #b42318;
  --crit-ink: #971d14;
  --crit-soft: #f8eceb;
  --crit-border: #f0d5d2;
  --info: #00509d;
  --info-soft: #e8eef5;
  --info-border: #dce7f1;

  /* -- Chrome ------------------------------------------------------------- */
  --focus: #00509d;
  --scrim: rgb(16 19 23 / 0.4);
  --track: #e6e8eb;
  --skeleton: #eaecf0;

  /* -- Elevação: só overlays ---------------------------------------------- */
  --shadow-raised: none;
  --shadow-overlay:
    0 1px 2px rgb(16 19 23 / 0.06), 0 8px 24px -6px rgb(16 19 23 / 0.12),
    0 24px 56px -12px rgb(16 19 23 / 0.14);
  --shadow-band: none;

  color-scheme: light;
}

.dark {
  --canvas: #0c0d0f;
  --canvas-subtle: #101215;
  --surface: #16181b;
  --surface-2: #1d1f23;
  --surface-3: #24272c;
  --surface-hover: #1f2226;

  --hairline: #262a2f;
  --hairline-strong: #343941;

  --ink: #f2f4f6;
  --ink-2: #c3c9d1;
  --ink-3: #8b929c;
  --ink-4: #626973;

  --brand: #2b7cc9;
  --brand-hover: #3b8cd9;
  --brand-2: #4d9ae0;
  --brand-3: #35b6ec;
  --brand-soft: #16222f;
  --brand-soft-2: #1a2c3d;
  --brand-border: #16222f;
  --brand-text: #7fb6e6;
  --on-brand: #ffffff;
  --brand-mark: #2b83d4;

  --band: #1d1f23;
  --band-2: #24272c;
  --band-ink: #f2f4f6;
  --band-ink-2: #8b929c;
  --band-ink-3: #626973;
  --band-line: #262a2f;
  --band-inset: #16181b;

  --ok: #8b929c;
  --ok-ink: #c3c9d1;
  --ok-soft: #1d1f23;
  --ok-border: #262a2f;
  --warn: #b99552;
  --warn-ink: #d0b17a;
  --warn-soft: #201c14;
  --warn-border: #3a3222;
  --risk: #cd8a45;
  --risk-ink: #e0a970;
  --risk-soft: #231a12;
  --risk-border: #40301f;
  --crit: #e0554b;
  --crit-ink: #f08a82;
  --crit-soft: #241614;
  --crit-border: #452421;
  --info: #4d9ae0;
  --info-soft: #16222f;
  --info-border: #1a2c3d;

  --focus: #4d9ae0;
  --scrim: rgb(4 5 7 / 0.66);
  --track: #262a2f;
  --skeleton: #1c1f23;

  --shadow-raised: none;
  --shadow-overlay:
    0 1px 2px rgb(0 0 0 / 0.5), 0 12px 32px -8px rgb(0 0 0 / 0.6),
    0 32px 64px -16px rgb(0 0 0 / 0.7);
  --shadow-band: none;

  color-scheme: dark;
}
```

### Como escolher a superfície

| Token | Onde | Classe |
|---|---|---|
| `--canvas` | fundo da página, atrás de tudo | `bg-canvas` |
| `--surface` | card, sidebar, header, modal, drawer, pílula ativa do segmented | `bg-surface` |
| `--surface-2` | card recuado, campo de formulário, chip/tag, avatar, trilho do segmented | `bg-surface-2` |
| `--surface-3` | hover de campo, contador ativo, trilho do segmented sobre `surface-2` | `bg-surface-3` |
| `--surface-hover` | hover de linha e de card clicável | `hover:bg-surface-hover` |

### Como escolher a tinta

| Token | Uso |
|---|---|
| `--ink` | título, valor, texto ativo |
| `--ink-2` | corpo de texto, ícone de nav inativo, botão ghost |
| `--ink-3` | label, legenda, subtítulo, texto secundário |
| `--ink-4` | placeholder, ícone decorativo, valor desligado |

### Trocar a marca (para um sistema novo)

Substitua **apenas** estes tokens e todo o resto acompanha:

```css
:root {
  --brand: #00509d;      --brand-hover: #003f7d;  --brand-2: #00509d;
  --brand-3: #0f6fc4;    --brand-text: #00457f;   --brand-soft: #e8eef5;
  --brand-soft-2: #dce7f1; --brand-border: #e8eef5; --brand-mark: #1567b8;
  --focus: #00509d;      --info: #00509d;
}
.dark {
  --brand: #2b7cc9;      --brand-hover: #3b8cd9;  --brand-2: #4d9ae0;
  --brand-3: #35b6ec;    --brand-text: #7fb6e6;   --brand-soft: #16222f;
  --brand-soft-2: #1a2c3d; --brand-border: #16222f; --brand-mark: #2b83d4;
  --focus: #4d9ae0;      --info: #4d9ae0;
}
```

Regra do `--focus`: é sempre o `--brand` do tema. Regra do `--on-brand`: sempre `#fff` — se o brand
novo não passar 4.5:1 com branco, escureça o brand, não clareie o texto.

---

## 4. Ponte Tailwind (`@theme inline`)

Tailwind v4 gera as utilidades a partir daqui. Cada `--color-x` cria `bg-x`, `text-x`, `border-x`,
`fill-x`, `ring-x`.

```css
@theme inline {
  --color-canvas: var(--canvas);
  --color-canvas-subtle: var(--canvas-subtle);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-surface-hover: var(--surface-hover);

  --color-hairline: var(--hairline);
  --color-hairline-strong: var(--hairline-strong);

  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-ink-4: var(--ink-4);

  --color-brand: var(--brand);
  --color-brand-hover: var(--brand-hover);
  --color-brand-2: var(--brand-2);
  --color-brand-3: var(--brand-3);
  --color-brand-soft: var(--brand-soft);
  --color-brand-soft-2: var(--brand-soft-2);
  --color-brand-border: var(--brand-border);
  --color-brand-text: var(--brand-text);
  --color-on-brand: var(--on-brand);

  --color-band: var(--band);
  --color-band-2: var(--band-2);
  --color-band-ink: var(--band-ink);
  --color-band-ink-2: var(--band-ink-2);
  --color-band-ink-3: var(--band-ink-3);
  --color-band-line: var(--band-line);
  --color-band-inset: var(--band-inset);

  --color-ok: var(--ok);
  --color-ok-ink: var(--ok-ink);
  --color-ok-soft: var(--ok-soft);
  --color-ok-border: var(--ok-border);
  --color-warn: var(--warn);
  --color-warn-ink: var(--warn-ink);
  --color-warn-soft: var(--warn-soft);
  --color-warn-border: var(--warn-border);
  --color-risk: var(--risk);
  --color-risk-ink: var(--risk-ink);
  --color-risk-soft: var(--risk-soft);
  --color-risk-border: var(--risk-border);
  --color-crit: var(--crit);
  --color-crit-ink: var(--crit-ink);
  --color-crit-soft: var(--crit-soft);
  --color-crit-border: var(--crit-border);
  --color-info: var(--info);
  --color-info-soft: var(--info-soft);
  --color-info-border: var(--info-border);

  --color-track: var(--track);
  --color-skeleton: var(--skeleton);
  --color-focus: var(--focus);

  --font-sans: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  /* Dois raios de verdade. `xs`/`sm` só para chip inline e controle miúdo;
     tudo que é superfície usa 12px — inclusive `lg`, `xl` e `2xl`. */
  --radius-xs: 6px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 12px;
  --radius-xl: 12px;
  --radius-2xl: 12px;

  --shadow-raised: var(--shadow-raised);
  --shadow-overlay: var(--shadow-overlay);
  --shadow-band: var(--shadow-band);
}
```

> **Detalhe crítico:** `rounded-lg`, `rounded-xl` e `rounded-2xl` são **todos 12px** de propósito. Um
> dev pode escrever `rounded-2xl` num modal e `rounded-lg` num callout — o resultado é o mesmo. O
> sistema torna impossível errar o raio de uma superfície.

---

## 5. Tipografia

### Famílias

Uma família, uma voz, duas larguras. **Geist** (a face que os dashboards shadcn/Vercel usam) e a mono
irmã, **Geist Mono**.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

**Só três pesos existem: 400, 500, 600.** Nunca `font-bold` (700), nunca `font-light`. O único 700+ no
app é o "A" do logotipo, que é ativo de marca e não tipografia de UI.

### Quando usar mono

Mono é para **valores que precisam alinhar numa coluna**: RA, protocolo, dinheiro, contagem regressiva
de SLA, KPI, eixo de gráfico, contador de badge, tecla `⌘K`. **Mono não é estilo de label.**

```css
.font-mono, [class*='font-mono'] {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;   /* mono cancela o tracking negativo do corpo */
}
```

### Escala real (todos os tamanhos usados no app)

| Papel | Classe | Peso | Cor |
|---|---|---|---|
| Título de página | `text-[24px] leading-[1.15] sm:text-[30px]` | `font-semibold` | `text-ink` |
| Métrica solta | `font-mono text-[30px] leading-none tracking-tight` | `font-medium` | `text-ink` |
| Valor de StatTile | `font-mono text-[24px] leading-none tracking-tight` | `font-medium` | `text-ink` ou accent |
| Título de card / modal | `text-[15px] leading-tight` | `font-semibold` | `text-ink` |
| Corpo, item de lista, label forte | `text-[13px]` | `font-medium` | `text-ink` |
| Aba / opção de segmented `sm` | `text-[13px]` / `text-[12.5px]` | `medium` → `semibold` no ativo | `text-ink-3` → `text-ink` |
| Label, legenda, eyebrow, subtítulo | `text-[12px]` | `font-medium` | `text-ink-3` |
| Erro / ajuda de campo | `text-[11.5px]` | `medium` / normal | `text-crit` / `text-ink-4` |
| Tag, chip, `dt`, rodapé de tile | `text-[11px]` | `font-medium` | `text-ink-3` / `text-ink-4` |
| Contador dentro de aba/badge | `font-mono text-[10px]`…`text-[11px]` | `font-medium` | `text-ink-2` / `text-ink-4` |

Não invente tamanhos fora desta lista. Se precisar de algo entre dois, use o menor.

### Tracking

```css
body        { letter-spacing: -0.006em; }  /* corpo: sutilmente apertado */
h1, h2, h3  { letter-spacing: -0.02em;  }  /* display: apertado, dá a confiança do sistema */
.font-mono  { letter-spacing: 0;        }  /* mono nunca aperta */
```

### Sentence case, sempre

Rótulos de seção são **sentence case em `text-[12px] font-semibold text-ink-3`**, nunca eyebrow mono
em caixa alta. Caixa alta repetida doze vezes por tela vira textura, e textura é o que torna uma
ferramenta densa cansativa de olhar por oito horas.

---

## 6. Forma: raios, sombras, espaçamento

### Raios

```
rounded-xs   6px   chip inline minúsculo
rounded-sm   8px   tag, contador de aba
rounded-md   12px  campo, item de nav, botão quadrado de ícone
rounded-lg   12px  callout, container do switch, ícone de header de modal
rounded-xl   12px  card, stat tile, popover, empty state
rounded-2xl  12px  modal
rounded-full   —   botão, chip toggle, segmented, avatar, dot, thumb do switch
```

### Sombras

```
shadow-raised   none                      ← nunca use; existe só para provar a regra
shadow-overlay  var(--shadow-overlay)     ← modal, drawer, popover, toast. E só.
```

### Espaçamento — grade de 4px

| Contexto | Valor |
|---|---|
| Padding de card | `p-5` (20px) |
| Padding de stat tile / callout | `p-4` / `p-3.5` |
| Padding de header/footer de modal | `px-5 py-4` / `px-5 py-3.5` |
| Padding de `main` | `px-4 py-6 sm:px-6 lg:px-8` |
| Gap entre cards de uma grade | `gap-4` (16px) |
| Gap entre seções de uma página | `space-y-4` / `space-y-6` |
| Gap de ícone→texto num botão | `gap-1.5` (xs/sm) · `gap-2` (md) |
| Gap de barra de ações | `gap-2` |

### Alturas de controle

```
h-7   (28px)  botão xs, chip, segmented xs
h-8   (32px)  botão sm, segmented sm, botão de ícone de modal
h-9   (36px)  input, select, textarea, trigger de busca, avatar md
h-9.5 (38px)  botão md
h-5 w-9       switch (thumb h-4 w-4)
h-1.25        dot de status (5px)
h-0.5         trilho lateral de linha ativa / callout
```

### Largura de conteúdo

```
max-w-[1440px]   container do main
max-w-3xl        descrição de PageHeader
max-w-2xl        subtítulo de CardHeader
max-w-sm         mensagem de EmptyState
max-w-md         trigger de busca no header
```

---

## 7. Camada base e utilitários

```css
@layer base {
  /* Toda borda que alguém desenhar já nasce hairline — não precisa dizer a cor. */
  * { border-color: var(--hairline); }

  html {
    background-color: var(--canvas);
    -webkit-text-size-adjust: 100%;
    scrollbar-gutter: stable;   /* a página não pula quando o scroll aparece */
  }

  body {
    margin: 0;
    min-height: 100vh;
    background-color: var(--canvas);
    color: var(--ink);
    font-family: var(--font-sans);
    font-optical-sizing: auto;
    letter-spacing: -0.006em;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  h1, h2, h3 { letter-spacing: -0.02em; }

  .font-mono, [class*='font-mono'] {
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
  }

  button, input, select, textarea {
    font: inherit;
    letter-spacing: inherit;
    color: inherit;
  }

  button:not(:disabled) { cursor: pointer; }

  :focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
    border-radius: var(--radius-xs);
  }
  :focus:not(:focus-visible) { outline: none; }

  ::selection { background-color: var(--brand-2); color: #fff; }
  ::placeholder { color: var(--ink-4); }

  /* Ícone nativo de date/time some no dark — inverte. */
  .dark input[type='date']::-webkit-calendar-picker-indicator,
  .dark input[type='time']::-webkit-calendar-picker-indicator {
    filter: invert(1) opacity(0.55);
  }
}

@layer utilities {
  .tabular { font-variant-numeric: tabular-nums; }

  /* Scrollbar: presente, mas quieta. */
  .scroll-slim { scrollbar-width: thin; scrollbar-color: var(--hairline-strong) transparent; }
  .scroll-slim::-webkit-scrollbar { width: 8px; height: 8px; }
  .scroll-slim::-webkit-scrollbar-track { background: transparent; }
  .scroll-slim::-webkit-scrollbar-thumb {
    background: var(--hairline-strong);
    border: 2px solid transparent;
    background-clip: content-box;
    border-radius: 9999px;
  }
  .scroll-slim::-webkit-scrollbar-thumb:hover {
    background: var(--ink-4);
    background-clip: content-box;
  }

  /* O scrim: borra e dessatura o app atrás do overlay. */
  .scrim {
    background-color: var(--scrim);
    backdrop-filter: blur(14px) saturate(115%);
    -webkit-backdrop-filter: blur(14px) saturate(115%);
  }

  /* Superfície de ênfase — plana. */
  .band-surface { background-color: var(--band); }
  .band-grid::before { content: none; }

  /* Indicador "ao vivo": uma pulsação calma, nunca uma festa. */
  .pulse-dot { position: relative; }
  .pulse-dot::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 9999px;
    border: 1.5px solid currentColor;
    opacity: 0;
    animation: csa-pulse 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
  }
  @keyframes csa-pulse {
    0%        { transform: scale(0.7);  opacity: 0.55; }
    70%, 100% { transform: scale(1.45); opacity: 0; }
  }

  /* Skeleton */
  .shimmer {
    background-image: linear-gradient(
      90deg,
      var(--skeleton) 0%,
      var(--surface-3) 40%,
      var(--skeleton) 80%
    );
    background-size: 200% 100%;
    animation: csa-shimmer 1.4s ease-in-out infinite;
  }
  @keyframes csa-shimmer { to { background-position: -200% 0; } }

  /* Impressão: extração de relatório executivo. */
  @media print {
    .print\:hidden { display: none !important; }
    .print-report { background: #fff !important; color: #000 !important; }
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Motion spec

Três curvas, sem improviso.

- **spring** — o que se move **entre duas posições conhecidas** (pílula do segmented, sublinhado de
  aba, reordenação de linhas, thumb do switch).
- **emphasis** — o que **chega** (modal, drawer, toast, revelação de página).
- **exit** — o que **sai**. Sempre mais rápido que a entrada, porque uma UI que demora a sumir parece
  lenta.

```ts
// src/lib/motion.ts
import type { Transition, Variants } from 'motion/react';

/** Spring rápido, sem overshoot, para transição de layout. */
export const spring: Transition = { type: 'spring', stiffness: 460, damping: 38, mass: 0.7 };

/** Spring mais macio para superfícies grandes (drawers, painéis). */
export const springSoft: Transition = { type: 'spring', stiffness: 320, damping: 32, mass: 0.9 };

/** Curva de desaceleração assinatura da Apple. */
export const emphasis = [0.16, 1, 0.3, 1] as const;
/** Curva de aceleração — só em saída. */
export const exitCurve = [0.4, 0, 1, 1] as const;

export const enterFast: Transition = { duration: 0.22, ease: emphasis };
export const exitFast: Transition = { duration: 0.13, ease: exitCurve };

/* -- Transição de rota ---------------------------------------------------- */

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.26, ease: emphasis } },
  exit: { opacity: 0, y: -6, transition: exitFast },
};

/* -- Listas com stagger --------------------------------------------------- */

export const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: emphasis } },
};

/* -- Overlays ------------------------------------------------------------- */

export const scrimVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18, ease: emphasis } },
  exit: { opacity: 0, transition: { duration: 0.14, ease: exitCurve } },
};

export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.975, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0, transition: springSoft },
  exit: { opacity: 0, scale: 0.985, y: 6, transition: exitFast },
};

export const drawerVariants: Variants = {
  initial: { x: '100%' },
  animate: { x: 0, transition: springSoft },
  exit: { x: '100%', transition: { duration: 0.2, ease: exitCurve } },
};

export const popoverVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: -6 },
  animate: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.1 } },
};

export const toastVariants: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: springSoft },
  exit: { opacity: 0, x: 24, scale: 0.97, transition: exitFast },
};

/** Revelação vertical de acordeão. */
export const collapseVariants: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { duration: 0.26, ease: emphasis } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.18, ease: exitCurve } },
};

/* -- Microinterações ------------------------------------------------------ */

/** Feedback de toque uniforme em todo o app. */
export const press = { scale: 0.975 } as const;
export const pressSubtle = { scale: 0.99 } as const;
```

### Regras de motion

1. **Todo controle clicável recebe `whileTap={press}`.** Nada mais. Sem hover-lift, sem
   `hover:scale`, sem `translate-y` no hover de card.
2. **Transição de cor é sempre `transition-colors duration-150`** (ou `transition-colors` puro).
   Nunca `transition-all`.
3. **`layoutId` para o indicador ativo** — pílula do segmented, sublinhado de aba, fundo do item de
   nav. O `layoutId` precisa ser **único por instância** (passe como prop).
4. **Contadores contam a partir do zero na montagem** e fazem tween entre valores nas atualizações,
   com easing `1 - (1-p)³` e 620ms.
5. **A saída é sempre mais rápida que a entrada.**
6. `prefers-reduced-motion` já está tratado na camada base — não repita em componente.

---

## 9. Layout do shell

```
┌────────────┬────────────────────────────────────────────────┐
│  Sidebar   │  Header  sticky top-0 z-20  h-[74px]           │
│  sticky    │  bg-surface/85 backdrop-blur-xl                │
│  top-0     │  border-b border-hairline                      │
│  z-30      ├────────────────────────────────────────────────┤
│  h-screen  │  main  px-4 py-6 sm:px-6 lg:px-8               │
│  bg-surface│    div  mx-auto w-full max-w-[1440px]          │
│  244px     │      <AnimatePresence mode="wait">             │
│  ou 68px   │        {view}   ← pageVariants                 │
│  colapsada │      </AnimatePresence>                        │
└────────────┴────────────────────────────────────────────────┘
```

```tsx
<div className="flex min-h-screen bg-canvas">
  <Sidebar … />
  <div className="flex min-w-0 flex-1 flex-col">
    <Header … />
    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1440px]">
        <AnimatePresence mode="wait">{renderView()}</AnimatePresence>
      </div>
    </main>
  </div>
  {/* overlays no fim, fora do fluxo */}
</div>
```

### Sidebar

```tsx
<motion.aside
  animate={{ width: collapsed ? 68 : 244 }}
  transition={spring}
  className="sticky top-0 z-30 flex h-screen shrink-0 flex-col bg-surface select-none print:hidden"
>
```

- Zona da marca: `h-[74px] px-4` — **mesma altura do header**, então a linha do topo fecha.
- Item de nav: `flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors`.
  Inativo `text-ink-2 hover:bg-surface-2 hover:text-ink`; ativo `text-on-brand` + um
  `<motion.span layoutId="sidebar-active" className="absolute inset-0 rounded-md bg-brand" />`.
  Ícone: `h-4 w-4`, `text-ink-4` inativo / `text-on-brand` ativo.
- **Um único número na navegação** — o badge da fila. É o único que muda o que você faz a seguir.
- **Hierarquia de navegação:** o que se usa todo dia fica plano e visível; o que é de gestão vive
  atrás de **um** grupo colapsado que abre sozinho quando você está numa das telas dele. Sem
  sub-cabeçalho acima de três itens, sem seção segurando um único link.

### Header

```tsx
<header className="sticky top-0 z-20 border-b border-hairline bg-surface/85 backdrop-blur-xl print:hidden">
  <div className="flex h-[74px] items-center gap-3 px-4 sm:px-6">
```

O trigger da command palette (⌘K):

```tsx
<button className="group flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg bg-surface-2 px-3 text-left transition-colors sm:max-w-md">
  <Search className="h-3.5 w-3.5 shrink-0 text-ink-4 transition-colors group-hover:text-brand-2" />
  <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-4">Buscar…</span>
  <kbd className="hidden shrink-0 rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-4 sm:block">
    ⌘K
  </kbd>
</button>
```

O header carrega os **recortes globais** da operação (no caso: modalidade e coorte). São globais de
propósito — trocar o recorte re-escopa todas as telas de uma vez, que é a única forma de os números
de telas diferentes poderem ser confiados a concordar. Uma tela que tem a própria barra de recortes
esconde os do header (`hideScopeControls`): dois controles idênticos na mesma tela fazem o usuário
procurar a diferença entre eles.

### Escala de z-index

```
z-20  header sticky
z-30  sidebar sticky
z-50  scrim + modal/drawer, popover de notificação
```

### Pré-pintura do tema (obrigatório no `index.html`)

Sem isto, o app pisca a paleta errada no primeiro render.

```html
<script>
  (function () {
    try {
      var stored = localStorage.getItem('app.v1.theme');
      // O store serializa em JSON — a entrada crua é '"dark"', com aspas.
      var theme = stored === 'dark' || stored === '"dark"' ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.style.colorScheme = theme;
    } catch (e) {
      /* storage indisponível — cai no claro */
    }
  })();
</script>
```

> **Duas armadilhas que custaram bug real neste projeto:**
> 1. O store serializa em JSON, então a entrada crua é `'"dark"'`, aspas incluídas. Comparar a string
>    crua com `'dark'` silenciosamente nunca casava.
> 2. Se a chave carrega prefixo de schema (`app.v4.theme`) e o schema sobe de versão, **esta linha
>    sobe junto**. Uma chave defasada faz o passe pré-pintura ler algo que não existe, cair no claro,
>    e o app trocar a paleta no primeiro render — exatamente o flash que este bloco existe para evitar.

Meta tags de cor do sistema:

```html
<meta name="theme-color" content="#f3f4f6" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0c0d0f" media="(prefers-color-scheme: dark)" />
```

---

## 10. Componentes — API e classes exatas

Estrutura de arquivos:

```
src/components/ui/
  Button.tsx     Button, LinkButton
  Surfaces.tsx   Card, CardHeader, PageHeader, SectionLabel, StatTile, Metric,
                 Row, EmptyState, Skeleton, DataList, Callout, Tabs, ChevronAffordance
  Badges.tsx     Pill, Avatar, TrendIndicator + badges de domínio
  Fields.tsx     Label, Field, TextInput, TextArea, Select, SearchInput,
                 Segmented, Switch, Chip
  Overlay.tsx    Modal, Drawer, Confirm
  Charts.tsx     AnimatedNumber, ScoreRing, Donut, MeterBar, StackedBar,
                 Sparkline, ColumnChart, heatColor
  Plot.tsx       LineChart, StackedColumns, BarList
```

### 10.1 Button

Botões são **pílulas**; superfícies são retângulos de 12px. Duas silhuetas para o app inteiro, então a
silhueta sozinha diz se a coisa é um lugar ou uma ação.

Variantes carregam **significado**, não aparência:

| Variante | Classes | Quando |
|---|---|---|
| `primary` | `bg-brand text-on-brand hover:bg-brand-hover` | **a** ação mais importante da tela. **Uma por view.** O único lugar onde o azul preenche uma forma. |
| `secondary` | `bg-surface-2 text-ink hover:bg-surface-3` | alternativa real à primária. Preenchida, nunca contornada. *(padrão)* |
| `ghost` | `text-ink-2 hover:bg-surface-2 hover:text-ink` | terciária; vive em linha densa e toolbar |
| `danger` | `bg-crit text-white hover:brightness-110` | destrutivo ou irreversível |

Tamanhos:

```ts
const SIZE = {
  xs: 'h-7   text-[12px] gap-1.5 rounded-full',
  sm: 'h-8   text-[13px] gap-1.5 rounded-full',
  md: 'h-9.5 text-[13px] gap-2   rounded-full',
};
const PAD    = { xs: 'px-3',  sm: 'px-3.5', md: 'px-4.5' };
const SQUARE = { xs: 'w-7',   sm: 'w-8',    md: 'w-9.5'  };
```

> **Armadilha resolvida no código:** geometria e padding são **listas separadas**. Emitir `px-3.5` e
> `px-0` juntos e torcer para o segundo vencer não funciona — o Tailwind decide pela ordem na folha
> de estilo, não no atributo `class`. `px-3.5` vencia e um botão quadrado de 32px acabava com 28px de
> padding, espremendo o ícone de 14px para 4px. Um botão quadrado agora simplesmente **nunca recebe
> padding horizontal**.

Classes fixas de todo botão:

```
inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap
transition-colors duration-150 select-none
disabled:pointer-events-none disabled:opacity-45
```

Mais `whileTap={press}` (suprimido quando `disabled`). Props: `variant`, `size`, `icon`, `iconRight`,
`square`, `full`.

> **Nota React 19 + motion:** os handlers nativos `onDrag` / `onDragStart` / `onDragEnd` /
> `onAnimation*` colidem com os de mesmo nome do Motion. **Omita-os do tipo** em vez de silenciar com
> `any` — silenciar esconderia erros reais:
> ```ts
> type NativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>,
>   'onDrag'|'onDragStart'|'onDragEnd'|'onAnimationStart'|'onAnimationEnd'|'onAnimationIteration'>;
> ```

**LinkButton** — ação inline no rodapé de card:

```
inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-2
transition-colors hover:text-ink disabled:opacity-45
```

### 10.2 Card

Um card é uma superfície mais clara e um raio de 12px. **É a receita inteira.**

```tsx
<Tag className={['rounded-xl', tone === 'plain' ? 'bg-surface' : 'bg-surface-2', padded ? 'p-5' : '', className]}>
```

Props: `padded` (default `true`), `tone: 'plain' | 'inset' | 'band'`, `as: 'section' | 'div' | 'article' | 'aside'`.
`inset` e `band` são o mesmo: **um passo de contraste**, sem matiz, sem moldura.

### 10.3 CardHeader

```tsx
<div className="relative flex items-start justify-between gap-4">
  <div className="min-w-0">
    {eyebrow && (
      <div className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-ink-3">{eyebrow}</div>
    )}
    <h2 className="text-[15px] leading-tight font-semibold text-ink">{title}</h2>
    {subtitle && <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-ink-3">{subtitle}</p>}
  </div>
  {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
</div>
```

`eyebrow` só quando nomeia uma seção real. **Não em todo card.**

### 10.4 PageHeader

```tsx
<header className="space-y-4">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div className="min-w-0">
      {eyebrow && (
        <div className="mb-1.5 flex items-center gap-2 text-[12px] font-medium text-ink-3">{eyebrow}</div>
      )}
      <h1 className="text-[24px] leading-[1.15] font-semibold text-ink sm:text-[30px]">{title}</h1>
      {description && (
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-3">{description}</p>
      )}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
  {children /* barra de filtros ou segmented desta página */}
</header>
```

### 10.5 SectionLabel

```tsx
<div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-2">
  <h2 className="text-[12px] font-semibold text-ink-3">{children}</h2>
  {action}
</div>
```

### 10.6 StatTile

```tsx
<div className="flex flex-col rounded-xl p-4 bg-surface">   {/* tone 'band' → bg-surface-2 */}
  <div className="relative flex items-start justify-between gap-3">
    <span className="text-[12px] font-medium text-ink-3">{label}</span>
    {icon && <span className="text-ink-4">{icon}</span>}
  </div>

  <div className="relative mt-2 flex items-baseline gap-2">
    <span
      className="font-mono text-[24px] leading-none font-medium tracking-tight"
      style={accent ? { color: accent } : undefined}
    >
      <span className={accent ? '' : 'text-ink'}>{value}</span>
    </span>
    {detail && <span className="text-[12px] text-ink-3">{detail}</span>}
  </div>

  {footer && (
    <div className="relative mt-3 flex items-center justify-between gap-2 border-t border-hairline pt-2.5 text-[11px] text-ink-3">
      {footer}
    </div>
  )}
</div>
```

Se receber `onClick`, vira `motion.button` com `whileTap={press}` +
`text-left transition-colors hover:bg-surface-hover`.

### 10.7 Metric — um número sem caixa em volta

Para os poucos números que **abrem** uma tela. Separados por espaço em branco, não por cinco
cardzinhos em fila.

```tsx
<span className="block font-mono text-[30px] leading-none font-medium tracking-tight
                 {tone==='crit' ? 'text-crit-ink' : tone==='brand' ? 'text-brand-text' : 'text-ink'}">
  {value}
</span>
<span className="mt-2 block text-[12px] font-medium {tone==='brand' ? 'text-ink-2' : 'text-ink-3'}">
  {label}
</span>
```

`tone="brand"` marca **o** número que responde "e agora?" numa fileira de números que apenas
descrevem. **Um por fileira** — dois já viram wallpaper e o olho volta a ter de ler todos.

### 10.8 Row — o item de lista clicável

```tsx
<Tag className={[
  'relative block w-full text-left transition-colors',
  onClick ? 'cursor-pointer' : '',
  active ? 'bg-surface-2' : onClick ? 'hover:bg-surface-hover' : '',
]}>
  {(active || tone === 'crit') && (
    <span className={`absolute inset-y-0 left-0 w-0.5 ${active ? 'bg-brand' : 'bg-crit'}`} />
  )}
  {children}
</Tag>
```

**Trilho de 2px na borda esquerda** marca a linha ativa (azul) e a estourada (vermelha). Nunca fundo
tingido na linha inteira.

### 10.9 Callout

Caixa tingida com borda combinando era a coisa mais barulhenta da página. O tom agora vive num
**trilho de 2px na esquerda**; a caixa é só a superfície recuada. Mesma hierarquia, uma fração da
tinta.

```tsx
<div className="relative flex gap-2.5 overflow-hidden rounded-lg bg-surface-2 p-3.5 pl-4">
  <span className={`absolute inset-y-0 left-0 w-0.5 ${rail}`} />
  {icon && <span className={`mt-px shrink-0 ${textClass}`}>{icon}</span>}
  <div className="min-w-0 text-[12px] leading-relaxed">
    {title && <p className={`font-semibold ${textClass}`}>{title}</p>}
    {children && <div className="mt-1 text-ink-2">{children}</div>}
  </div>
</div>
```

```
rail:  info bg-brand · warn bg-warn · crit bg-crit · ok bg-ink-4
text:  info text-ink · warn text-warn-ink · crit text-crit-ink · ok text-ink
```

### 10.10 Tabs (sublinhado)

```tsx
<div role="tablist" className="scroll-slim -mb-px flex gap-1 overflow-x-auto border-b border-hairline">
  <button role="tab" aria-selected={active}
    className="relative shrink-0 px-3.5 py-2.5 text-[13px] transition-colors
               {active ? 'font-semibold text-ink' : 'font-medium text-ink-3 hover:text-ink'}">
    <span className="flex items-center gap-1.5">
      {label}
      {count !== undefined && (
        <span className="rounded-sm px-1.5 py-px font-mono text-[10px] font-medium
                         {active ? 'bg-surface-3 text-ink-2' : 'bg-surface-2 text-ink-4'}">
          {count}
        </span>
      )}
    </span>
    {active && (
      <motion.span layoutId={layoutId} transition={{ duration: 0.22, ease: emphasis }}
        className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />
    )}
  </button>
</div>
```

### 10.11 EmptyState · Skeleton · DataList

```tsx
/* EmptyState — compact: 'gap-2 px-6 py-10' */
<div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-ink-4">
    {icon ?? <Inbox className="h-5 w-5" />}
  </div>
  <div>
    <p className="text-[13px] font-semibold text-ink">{title}</p>
    <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-ink-3">{message}</p>
  </div>
  {action}
</div>

/* Skeleton */
<div className="shimmer rounded-md {className}" />

/* DataList — dt/dd em grade de 1|2|3|4 colunas, gap-x-5 gap-y-3 */
<dt className="text-[11px] font-medium text-ink-4">{label}</dt>
<dd className="mt-0.5 text-[13px] font-medium text-ink">{value}</dd>
```

### 10.12 Formulários

**Controles são preenchidos, não contornados.** A superfície recuada é o que diz "dá pra digitar
aqui". Um contorno repetiria o que o preenchimento já diz — e devolveria à tela um retângulo que a
gente acabou de tirar.

```ts
const CONTROL =
  'w-full rounded-md bg-surface-2 px-3 text-[13px] text-ink ' +
  'transition-colors placeholder:text-ink-4 hover:bg-surface-3 ' +
  'focus:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-focus ' +
  'disabled:opacity-50';
```

- `TextInput` → `${CONTROL} h-9`
- `TextArea` → `${CONTROL} resize-y py-2 leading-relaxed` (rows padrão 3)
- `Select` → `${CONTROL} h-9 cursor-pointer appearance-none pr-8` + `<ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />`
- `SearchInput` → `${CONTROL} h-9 pr-8 pl-9 [&::-webkit-search-cancel-button]:hidden` + ícone `Search` à esquerda + botão `X` de limpar (`aria-label="Limpar busca"`)

**A única linha que um controle desenha é o anel de foco**, porque esse é o único momento em que um
contorno carrega informação.

**Label** — o obrigatório é marcado **uma vez**, ao lado do rótulo; a dica fica **sob** o controle,
onde é lida **depois** do valor e não antes:

```tsx
<div className="mb-1.5 flex items-baseline justify-between gap-3">
  <label className="text-[12px] font-medium text-ink">
    {children}
    {required && <span className="ml-1 text-crit">*</span>}
  </label>
  {hint && <span className="text-[11px] text-ink-4">{hint}</span>}
</div>
{/* controle */}
<p className="mt-1.5 text-[11.5px] font-medium text-crit">{error}</p>
<p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-4">{help}</p>
```

`Field` gera o `id` com `useId()` e o entrega ao filho como função: `children: (id: string) => ReactNode`.

**Segmented** — trilho pílula + pílula deslizante com `layoutId`:

```tsx
<div role="tablist"
  className="inline-flex shrink-0 items-center gap-0.5 rounded-full p-0.5
             {tone==='band' ? 'bg-surface-3' : 'bg-surface-2'}">
  <button role="tab" aria-selected={active}
    className="relative flex items-center justify-center gap-1.5 rounded-full whitespace-nowrap transition-colors
               {size==='xs' ? 'h-7 px-2.5 text-[11.5px]' : 'h-8 px-3 text-[12.5px]'}
               {active ? 'font-semibold text-ink' : 'font-medium text-ink-3 hover:text-ink'}">
    {active && (
      <motion.span layoutId={layoutId} transition={spring}
        className="absolute inset-0 rounded-full bg-surface" />
    )}
    <span className="relative z-10 flex items-center gap-1.5">{icon}{label}{count}</span>
  </button>
</div>
```

`layoutId` **único por instância** — dois segmenteds com o mesmo id fazem a pílula voar entre eles.

**Switch** — dentro de uma linha explicativa:

```tsx
<div className="flex items-start justify-between gap-4 rounded-lg bg-surface-2 p-3.5">
  <div className="min-w-0">
    <label className="block text-[13px] font-medium text-ink">{label}</label>
    <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">{description}</p>
  </div>
  <button role="switch" aria-checked={checked} aria-label={label}
    className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200
               {checked ? 'bg-brand' : 'bg-hairline-strong'}">
    <motion.span layout transition={spring}
      className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm"
      style={{ left: checked ? 18 : 2 }} />
  </button>
</div>
```

**Chip** (filtro multi-seleção) — o ativo é **tinta sólida**, não azul. O azul está reservado (Regra 4):

```tsx
<button aria-pressed={active}
  className="inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] transition-colors
    {active
      ? (tone==='crit' ? 'bg-crit font-semibold text-white' : 'bg-ink font-semibold text-canvas')
      : 'bg-surface-2 font-medium text-ink-3 hover:bg-surface-3 hover:text-ink'}">
  {children}
  {count !== undefined && <span className="font-mono text-[10.5px] opacity-70">{count}</span>}
</button>
```

### 10.13 Modal e Drawer

**Uma implementação de overlay**, para que todo diálogo do app se comporte igual:

- O app atrás é **borrado e dessaturado**, não só escurecido — a folha lê como vidro flutuando sobre
  o workspace, não como caixa sobre um retângulo cinza.
- **Escape fecha. Clique no scrim fecha. O botão fecha.**
- **Foco** entra na folha ao abrir, fica **preso** dentro enquanto aberta, e **volta ao gatilho** ao
  fechar.
- **Scroll do body travado com a largura da scrollbar compensada**
  (`paddingRight = innerWidth - clientWidth`), para a página não deslizar de lado quando o diálogo
  aparece.
- **A animação de saída de fato roda**, porque o `<AnimatePresence>` mora **aqui dentro**, não em
  volta de um `return null` precoce.

```ts
const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),' +
  'select:not([disabled]),[tabindex]:not([tabindex="-1"])';
```

O primeiro foco procura, em ordem: `[data-autofocus]` → primeiro `FOCUSABLE` → a própria folha. Com
60ms de atraso, para não brigar com a animação de entrada. O `keydown` é registrado em **fase de
captura** (`true`) para que o Escape do diálogo vença o de qualquer coisa embaixo.

**Modal:**

```tsx
<motion.div
  className="scrim fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-[6vh] sm:p-6 sm:py-[8vh]"
  variants={scrimVariants} initial="initial" animate="animate" exit="exit"
  onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
>
  <motion.div role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
    variants={modalVariants} initial="initial" animate="animate" exit="exit"
    className="relative flex w-full flex-col overflow-hidden outline-none
               rounded-2xl bg-surface shadow-overlay max-h-[86vh] {MODAL_WIDTH[size]}">

    <header className="flex shrink-0 items-start justify-between gap-4 border-b border-hairline px-5 py-4">…</header>
    <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">{children}</div>
    <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-hairline bg-surface-2/60 px-5 py-3.5">
      {footer}
    </footer>
  </motion.div>
</motion.div>
```

```
MODAL_WIDTH = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }
```

Ícone do header: `mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2`.
Botão de fechar: `-mt-0.5 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-4 transition-colors hover:bg-surface-2 hover:text-ink` com `aria-label="Fechar"`.

**Drawer** — entra pela direita:

```tsx
<motion.div className="scrim fixed inset-0 z-50 flex justify-end" variants={scrimVariants} …>
  <motion.aside role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
    variants={drawerVariants} initial="initial" animate="animate" exit="exit"
    className="relative flex h-full w-full flex-col overflow-hidden outline-none
               border-l border-hairline bg-surface shadow-overlay {DRAWER_WIDTH[width]}">
    {children}
  </motion.aside>
</motion.div>
```

```
DRAWER_WIDTH = { md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-3xl' }
```

A `border-l` do drawer é a **única borda-que-não-é-divisor** do sistema, e existe porque a folha
encosta na margem da janela: ali a linha separa dois planos, não fecha uma forma.

---

## 11. Visualização de dados

### As três regras dos gráficos

1. **Um gráfico tem de responder a uma pergunta que o número sozinho não responde.** Caso contrário
   é um número, e a gente renderiza um número.
2. **Cor codifica a escala de status e nada mais.** Sem arco-íris categórico — toda série aqui é
   ordinal.
3. **Eixos, rótulos e valores vivem na face mono com figuras tabulares**, para os valores alinharem
   na coluna e serem comparados a olho.

### A única exceção da Regra 4 (cor é conquistada)

A **rampa de risco** verde → amarelo → laranja → vermelho. Ela vale para o donut de distribuição **e**
para a linha de evolução, porque as duas codificam a **mesma variável ordinal** — se a faixa "Crítico"
fosse vermelha no donut e cinza no gráfico ao lado, seriam dois alfabetos para uma palavra.

```ts
export const SCORE_BANDS = [
  { status: 'Estável', label: 'Estável',    range: [81, 100], token: 'ok',   hex: (d) => (d ? '#3fb96b' : '#15803d') },
  { status: 'Atenção', label: 'Atenção',    range: [61, 80],  token: 'warn', hex: (d) => (d ? '#e0b341' : '#ca8a04') },
  { status: 'Risco',   label: 'Alto risco', range: [41, 60],  token: 'risk', hex: (d) => (d ? '#f0844a' : '#ea580c') },
  { status: 'Crítico', label: 'Crítico',    range: [0, 40],   token: 'crit', hex: (d) => (d ? '#e0554b' : '#b42318') },
];
```

Cada faixa carrega `hex(dark)` porque `<svg fill>` não resolve `var()` em todo contexto de animação —
a rampa é a **única** lista de hex do app, e ela é derivada, não avulsa. O `status` é a chave do
modelo; o `label` é como a diretoria nomeia a faixa e é o que aparece em gráfico e legenda, onde há
espaço para as duas palavras.

### Paletas semânticas de gráfico

Fora da rampa, tudo é tinta e semântica:

```ts
/** Barras de intervenção: normal → atenção → falha. Uma cor por significado. */
export const SLA_COLOR = { inSla: 'var(--ink-3)', outSla: 'var(--crit)', pending: 'var(--warn)' };

/** Barra de sinal. Neutra por padrão; azul só quando é o recorte ativo. */
export const SIGNAL_COLOR = { idle: 'var(--ink-3)', active: 'var(--brand)' };

/** Régua de automação: automático → pendência → humano. */
export const AUTOMATION_COLOR = { auto: 'var(--ink-3)', pending: 'var(--warn)', human: 'var(--crit)' };

/** Desfecho de intervenção, ordenado como uma escala. */
// estabilizado  → goodColor (verde da rampa)   "estabilizou"
// acompanhamento→ var(--ink-3)                 "aberto"
// encaminhado   → var(--ink-4)                 "repassado"
// sem-contato   → var(--warn)                  "sem resposta"
// risco-mantido → var(--crit)                  "não resolveu"
```

> **Por que a fatia "humano" é vermelha e não azul:** ela era azul institucional, e isso gastava o
> azul num sliver de 6% enquanto a tela já tinha o seu único elemento azul em outro lugar. A rampa é
> a mesma dos outros gráficos — tinta para o caso normal, âmbar para "a automação ainda está
> tentando", vermelho para "escalou para uma pessoa". Não é juízo moral: é a fatia que a operação
> quer menor.

### Os quatro invariantes técnicos dos gráficos

1. **MEDIR O CONTÊINER antes de desenhar.** Um SVG com `viewBox` esticado deforma a espessura do
   traço e desalinha o texto do eixo; medir custa um `ResizeObserver` e devolve um gráfico nítido em
   qualquer largura.

   > **Descarte o zero transitório.** Uma medição de 0 no meio de um reflow desmontava o `<svg>`, e a
   > remontagem reiniciava o desenho da linha do zero. O sintoma era uma curva pela metade meio
   > segundo depois de trocar um filtro, e uma redesenhada completa a cada resize da janela —
   > exatamente a animação que chama atenção para si mesma. Manter a última largura boa mantém o
   > elemento montado, e a linha apenas atualiza:
   > ```ts
   > setWidth((prev) => (next > 0 ? next : prev));
   > ```

2. **UM ÚNICO ÍNDICE DE HOVER** controla guia, marcadores e tooltip. O ponteiro nunca precisa acertar
   um alvo de 3px: a faixa vertical mais próxima ganha o foco — é assim que um gráfico denso fica
   utilizável com o mouse.

3. **TECLADO FUNCIONA.** Setas caminham pelos pontos e o tooltip acompanha. Um gráfico que só
   responde ao mouse é um gráfico que a diretoria não lê no projetor.

4. **A ESCALA VEM SÓ DAS SÉRIES VISÍVEIS.** Ocultar uma série tem de ser útil: esconder "Estável"
   (13.006) é o que permite ver "Crítico" (467) se mover.

Mais: **ticks redondos**. Um eixo terminando em 3.678 obriga a ler cada rótulo; terminando em 4.000, a
posição já diz o valor. `niceScale()` normaliza para passos de 1 / 2 / 2.5 / 5 / 10 × 10ⁿ.

### AnimatedNumber

Conta do zero na montagem, faz tween entre valores nas atualizações — um score indo de 78 → 86 lê como
**movimento**, não como corte seco. `duration = 620ms`, easing `1 - (1-p)³` via `requestAnimationFrame`.
`resetOnChange` força recontar do zero quando cada atualização deve ler como uma contagem nova (o
donut re-escopando a um filtro), não como deriva.

### Inventário de formas

| Primitivo | Arquivo | Para quê |
|---|---|---|
| `AnimatedNumber` | Charts | qualquer KPI que muda |
| `ScoreRing` | Charts | um score 0–100 com veredito |
| `Donut` | Charts | distribuição por faixa ordinal |
| `MeterBar` | Charts | uma proporção contra um alvo |
| `StackedBar` | Charts | composição de uma linha |
| `Sparkline` | Charts | tendência dentro de um tile |
| `ColumnChart` | Charts | série curta e discreta |
| `heatColor(ratio)` | Charts | célula de heatmap na rampa |
| `LineChart` | Plot | série temporal multissérie |
| `StackedColumns` | Plot | composição ao longo do tempo |
| `BarList` | Plot | ranking horizontal |

---

## 12. Vocabulário de status

Há **dois tipos de rótulo pequeno** no app e eles **não podem parecer iguais**:

| | STATUS | TAG |
|---|---|---|
| O que é | um **veredito** sobre o qual você talvez tenha de agir | um **fato** sobre o registro (modalidade, campus, radar) |
| Forma | ponto colorido + palavra. **Sem preenchimento, sem contorno.** | chip preenchido quieto em `ink-3` |
| Por quê | dez linhas de balãozinho tingido com borda é um saco de balas; dez linhas de palavra pontuada varrem numa passada **e ainda deixam a linha crítica pular** | não carrega urgência, então não ganha cor nem ponto |

```tsx
/* STATUS */
<span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] whitespace-nowrap
                 {solid ? `font-semibold ${EMPHASIS_INK[tone]}` : 'font-medium text-ink-2'}">
  <span className={`h-1.25 w-1.25 shrink-0 rounded-full ${DOT[tone]}`} />
  {children}
</span>

/* TAG */
<span className="inline-flex shrink-0 items-center rounded-sm bg-surface-2 px-1.5 py-0.5
                 text-[11px] font-medium whitespace-nowrap text-ink-3">
  {children}
</span>
```

```ts
const DOT = {
  ok: 'bg-ok', warn: 'bg-warn', risk: 'bg-risk', crit: 'bg-crit',
  info: 'bg-brand-2', neutral: 'bg-ink-4', muted: 'bg-ink-4',
};

/** Tinta para veredito enfatizado. Só `crit` ganha vermelho. */
const EMPHASIS_INK = {
  ok: 'text-ink-2', warn: 'text-warn-ink', risk: 'text-risk-ink',
  crit: 'text-crit-ink', info: 'text-brand-text',
  neutral: 'text-ink-2', muted: 'text-ink-3',
};
```

`solid` **não** significa "fundo tingido + borda". Significa **"este veredito é o ponto da linha"**, e
gasta **peso de tinta** em vez de preenchimento.

### O estado saudável não tem ponto

O status de melhor faixa renderiza **só a palavra**, em `text-ink-3`, sem ponto:

```tsx
<span className="inline-flex shrink-0 items-center text-[12px] font-medium whitespace-nowrap text-ink-3">
  Estável
</span>
```

Não há nada a fazer sobre um aluno saudável, então a linha fica em silêncio — **e é exatamente isso
que torna o ponto âmbar e o vermelho visíveis três linhas abaixo.**

### Avatar — iniciais, não banco de imagens

Ferramenta interna de verdade mostra iniciais. Retrato de estoque de um estranho fazendo as vezes de
aluno real lê como mockup e, com dado real, como vazamento de privacidade.

```
xs h-6 w-6 text-[10px] · sm h-8 w-8 text-[11px] · md h-9 w-9 text-[12px] · lg h-12 w-12 text-[15px]

neutral   bg-surface-2 text-ink-2
crítico   bg-surface-3 text-ink        ← um tom mais escuro, NÃO vermelho
brand     bg-brand text-on-brand
onBrand   bg-white/15 text-on-brand    ← quando o avatar já está sobre superfície azul
```

Classes fixas: `inline-flex shrink-0 items-center justify-center rounded-full font-medium select-none`
+ `aria-hidden="true"`.

O tom é **um passo de preenchimento, não um matiz**. O ponto vermelho ao lado do nome já diz uma vez.

### TrendIndicator

```
up    ArrowUpRight    text-ink-2      ← subir não é automaticamente bom; é neutro
down  ArrowDownRight  text-crit-ink
flat  Minus           text-ink-4
```

`inline-flex items-center gap-0.5 font-mono text-[11.5px] font-medium`, ícone `h-3 w-3`.

---

## 13. Acessibilidade

- **Foco visível é global**, via `:focus-visible` na camada base — anel de 2px em `--focus` com
  `outline-offset: 2px`. Nenhum componente reimplementa isso; controles de formulário adicionam
  `focus:ring-2 focus:ring-focus` porque o preenchimento come o outline.
- **Papéis ARIA:** `role="tablist"` / `role="tab"` + `aria-selected` em Tabs e Segmented;
  `role="switch"` + `aria-checked` + `aria-label` no Switch; `aria-pressed` no Chip;
  `role="dialog"` + `aria-modal="true"` + `aria-labelledby` / `aria-label` nos overlays.
- **Trap de foco e restauração** em todo overlay (§10.13).
- `aria-hidden="true"` no Avatar — as iniciais são decorativas; o nome está no texto ao lado.
- **`title` como dica**, nunca como única fonte de informação.
- Botão de ícone sempre com `aria-label` (`"Fechar"`, `"Limpar busca"`).
- `prefers-reduced-motion` neutraliza animação e transição globalmente.
- **Cor nunca é o único canal:** todo status colorido vem acompanhado da palavra.
- Contraste-alvo: `--ink` e `--ink-2` passam AA sobre `--surface` nos dois temas; `--ink-4` é
  reservado a texto decorativo e placeholder.

---

## 14. Anti-padrões (zero "AI slop")

| ❌ Nunca | ✅ Em vez disso |
|---|---|
| `border border-hairline` em volta de um card | contraste de superfície: `bg-surface` sobre `bg-canvas` |
| `shadow-sm` / `shadow-md` em card, tile, painel | nada. Só overlay tem `shadow-overlay` |
| Gradiente roxo-azul, `bg-gradient-to-r from-*` decorativo | superfície plana |
| Balãozinho tingido com borda em cada linha da tabela | ponto + palavra (§12) |
| Painel azul royal ocupando uma seção inteira | `bg-surface-2` — um passo de contraste, sem matiz |
| Eyebrow mono em CAIXA ALTA em cada card | `SectionLabel` sentence case `text-[12px] font-semibold text-ink-3` |
| Seis raios diferentes na mesma tela | 12px para superfície, pílula para ação |
| `transition-all` | `transition-colors duration-150` |
| `hover:scale-105`, `hover:-translate-y-1` em card | `hover:bg-surface-hover` e `whileTap={press}` |
| Duas ações primárias na mesma tela | uma `primary`, o resto `secondary` / `ghost` |
| Paleta categórica arco-íris num gráfico ordinal | a rampa de risco (§11) |
| Emoji na UI | ícone `lucide-react` |
| Foto de estoque no avatar | iniciais |
| Cinco statzinhos em fila para números que só descrevem | `Metric` separada por espaço em branco |
| Hex escrito no componente | token semântico |
| Um segundo conjunto de classes `dark:` por componente | troca de token no `.dark` |
| `font-bold` (700) na UI | `font-semibold` (600) |
| Mono usada como estilo de label | mono só para valor que alinha em coluna |
| Número em toda entrada do menu | um único badge, no que muda o que você faz a seguir |
| Card com hairline **e** sombra **e** fundo tingido | escolha um passo de contraste. Um. |
| Contorno num input | preenchimento `bg-surface-2`; a única linha é o anel de foco |
| `AnimatePresence` em volta de um `return null` | o `AnimatePresence` mora dentro do componente |

---

## 15. Boilerplate: começar um sistema novo

### 15.1 Scaffold

```bash
npm create vite@latest meu-sistema -- --template react-ts
cd meu-sistema
npm i lucide-react motion
npm i -D tailwindcss @tailwindcss/vite @types/node
```

### 15.2 `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 3000, host: '0.0.0.0' },
});
```

### 15.3 `tsconfig.json` — modo estrito

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

### 15.4 `src/index.css`

Copie **na íntegra** as §3, §4 e §7 deste documento, nesta ordem:

```
@import 'tailwindcss'
@custom-variant dark
:root { … }
.dark { … }
@theme inline { … }
@layer base { … }
@layer utilities { … }
@media (prefers-reduced-motion: reduce) { … }
```

### 15.5 `index.html`

Preconnect + Geist / Geist Mono (§5), as duas `theme-color` e o script de pré-pintura (§9).

### 15.6 Ordem de construção

1. `src/index.css` — tokens. **Antes de qualquer JSX.**
2. `src/lib/motion.ts` — copie a §8 verbatim.
3. `src/components/ui/` — `Button.tsx`, `Surfaces.tsx`, `Fields.tsx`, `Badges.tsx`, `Overlay.tsx`.
   Os primitivos da §10, **com o mesmo cabeçalho de comentário explicando o porquê** — é o comentário
   que impede o sistema de derivar de volta para bordas e sombras seis meses depois.
4. O shell (§9): `App.tsx` + `Sidebar` + `Header`.
5. As views. **Nenhuma view escreve cor, raio ou sombra crua** — só compõe primitivos.

### 15.7 O que trocar por projeto

| Item | Onde |
|---|---|
| Tokens de marca | os 10 `--brand*` + `--focus` + `--info` em `:root` e `.dark` (§3) |
| Nome da chave de tema | `index.html` + `lib/storage.ts` (`app.vN.theme`) |
| Fonte | `--font-sans` / `--font-mono` no `@theme inline` + `<link>` no `index.html` |
| A rampa ordinal | `SCORE_BANDS` — só se o domínio tiver uma escala ordinal própria |
| Ícones do menu | `lucide-react`, `h-4 w-4` |
| Título e descrição | `index.html` |

**Não troque:** os cinzas de superfície, a escada de tinta, os raios, o motion spec, as cinco regras.
É deles que vem a semelhança entre os sistemas.

### 15.8 Prompt de bootstrap (cole numa sessão nova do Claude Code)

```
Leia DESIGN_SYSTEM.md por inteiro antes de escrever qualquer CSS ou JSX.

Construa <NOME DO SISTEMA> seguindo-o exatamente:

- Stack: React 19 + TypeScript + Vite 6 + Tailwind 4 (plugin Vite, SEM tailwind.config.js)
  + motion/react + lucide-react. Nenhuma biblioteca de UI ou de gráficos.
- Copie §3, §4 e §7 verbatim para src/index.css.
- Copie §8 verbatim para src/lib/motion.ts.
- Implemente os primitivos da §10 com as classes exatas listadas, mantendo os
  cabeçalhos de comentário que explicam o porquê de cada regra.
- Marca: --brand <hex light> / <hex dark>. Troque SÓ os tokens de marca da §3.
- Obedeça as cinco regras da §1 e a tabela de anti-padrões da §14 em toda tela.
- Nenhuma view escreve cor, raio ou sombra crua — só compõe primitivos.
- `npm run lint` (tsc --noEmit) e `npm run build` têm de compilar com 0 erro.

Domínio: <descreva o domínio, as telas e as entidades>
```

---

## 16. Checklist de revisão

Antes de dar por pronta qualquer tela:

**Estrutura**
- [ ] Nenhuma `border` fechando uma forma. Hairline só como divisor.
- [ ] Nenhuma sombra fora de overlay.
- [ ] Todo raio de superfície é 12px; toda ação é pílula.
- [ ] Nenhum hex escrito num componente.
- [ ] Nenhuma classe `dark:` — o tema resolve por token.

**Cor**
- [ ] O azul aparece no máximo em: botão primário, nav ativo, arco do donut.
- [ ] Vermelho só em SLA estourado / caso crítico.
- [ ] Uma única ação `primary` na tela.
- [ ] Um único `Metric` com `tone="brand"` por fileira.

**Tipografia**
- [ ] Só 400 / 500 / 600.
- [ ] Mono só em valor que alinha em coluna.
- [ ] Rótulo de seção em sentence case, não CAIXA ALTA mono.
- [ ] Todo tamanho vem da tabela da §5.

**Motion**
- [ ] Todo clicável tem `whileTap={press}`.
- [ ] Nada de `transition-all`.
- [ ] `layoutId` único por instância.
- [ ] Saída mais rápida que entrada.

**Acessibilidade**
- [ ] Botão de ícone tem `aria-label`.
- [ ] Overlay tem `role="dialog"`, `aria-modal`, trap de foco, Escape e restauração de foco.
- [ ] Status tem palavra além da cor.
- [ ] `role` / `aria-selected` / `aria-checked` / `aria-pressed` nos controles compostos.

**Dados**
- [ ] Todo gráfico responde a algo que o número sozinho não responde.
- [ ] Gráfico mede o contêiner e funciona no teclado.
- [ ] Eixos e valores em mono tabular; ticks redondos.

**Build**
- [ ] `npm run lint` (`tsc --noEmit`) — 0 erro.
- [ ] `npm run build` — 0 erro.

---

## 17. Skills e referências

### 17.1 Skills de design instaladas nesta máquina

Em `~/.claude/skills/`:

| Skill | O que fornece |
|---|---|
| `cravburgers-design` | Design system do cravburgers — tokens de cor, escala tipográfica, grade de espaçamento, padrões de componente e regras de craft. Modo ultra: `references/ANIMATIONS.md`, `LAYOUT.md`, `COMPONENTS.md`, `INTERACTIONS.md` |
| `gustavo-sextaro-design` | Design system do gustavo-sextaro — dark, paleta neutra, Inter, densidade compacta em grade de 4px, motion expressivo; inclui jornada de scroll em screenshots |

### 17.2 Skills embutidas do Claude Code relevantes para UI

| Skill | Quando invocar |
|---|---|
| `artifact-design` | fundamentos de design **antes** de publicar qualquer Artifact |
| `artifact-diagramming` | diagramas SVG legíveis nos dois temas |
| `artifact-capabilities` | páginas publicadas que leem dados vivos ou guardam estado |
| `dataviz` | **antes** de escrever a primeira linha de qualquer gráfico, KPI, meter ou dashboard |
| `design` | canvas multi-artboard (mockups, fluxos de tela, landing, peças gráficas) |
| `shadcn` | componentes shadcn/ui e registries — se um projeto novo optar por essa base |
| `code-review` / `simplify` | revisão do diff: correção, reuso, simplificação |
| `security-review` | revisão de segurança das mudanças da branch |
| `run` | subir o app e conferir a mudança de verdade |
| `init` | gerar o `CLAUDE.md` de um projeto novo |
| `update-config` | hooks, permissões e env em `settings.json` |
| `find-skills` | descobrir e instalar skills novas |

### 17.3 Empacotar este design system como skill

Para que ele ative sozinho em qualquer projeto novo:

```
~/.claude/skills/unianchieta-design/
  SKILL.md                 ← frontmatter + resumo das cinco regras
  references/DESIGN.md     ← este arquivo, na íntegra
```

`SKILL.md`:

```markdown
---
name: unianchieta-design
description: Design system UniAnchieta · Sucesso ao Aluno. Ative ao construir qualquer
  componente de UI, página ou elemento visual. Fornece tokens de cor exatos (light e dark),
  escala tipográfica Geist, grade de espaçamento, padrões de componente, motion spec e
  regras de craft. Leia references/DESIGN.md antes de escrever qualquer CSS ou JSX.
---

# UniAnchieta Design System

Você está construindo UI no sistema UniAnchieta. Ferramenta operacional densa, dois temas
resolvidos por token, Geist + Geist Mono, superfícies sem borda, uma única pílula azul por
tela, motion com spring curto.

As cinco regras:
1. Separação é contraste, não linha — card é superfície mais clara, nunca borda.
2. Hairline é divisor, nunca moldura.
3. Um raio de superfície (12px) e uma pílula.
4. Cor é conquistada — azul em três lugares, vermelho só em crítico.
5. Sem sombra no que não flutua — só overlay.

**Leia `references/DESIGN.md` por inteiro antes de escrever CSS ou JSX.**
```

### 17.4 Links

**Repositório deste sistema**
- https://github.com/victorpansonato-design/sucesso-ao-aluno

**Referência visual** — os links do briefing original (`comando.md`), que definiram o alvo estético:
- [Minimalist SaaS Dashboard · Clean UI](https://www.pinterest.com/search/pins/?q=minimalist%20saas%20dashboard%20clean%20ui)
- [Linear App UI Dashboard](https://www.pinterest.com/search/pins/?q=linear%20app%20ui%20dashboard%20design)
- [CRM Customer Timeline UI](https://www.pinterest.com/search/pins/?q=crm%20customer%20timeline%20ui%20design)
- [Modern Data Visualization · KPI Cards](https://www.pinterest.com/search/pins/?q=modern%20data%20visualization%20ui%20kpi%20card)
- [AI Copilot Sidebar & Modal Interface](https://www.pinterest.com/search/pins/?q=ai%20chat%20copilot%20dashboard%20ui)

**Fontes institucionais referenciadas pelo projeto**
- https://anchieta.br/calendario-academico-segundo-semestre/
- https://anchieta.br/calendario-academico-hibridos-segundo-semestre/

**Filosofia de referência**
Apple Human Interface Guidelines · Linear · Vercel Dashboard. A face Geist, a densidade e a
contenção de cor vêm de lá.

---

### A frase que resume o sistema

> **Um card é uma superfície mais clara sobre um canvas mais escuro. Um botão é uma pílula. Cor é
> conquistada. Nada flutua, exceto o que está genuinamente por cima. Toda linha que você desenha
> separa duas coisas — ela nunca fecha uma.**
