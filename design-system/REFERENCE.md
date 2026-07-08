# Eyris Design System — Referência para implementação

Fonte: projeto claude.ai/design "Eyris Design System" (`5ba3010b-8e60-4498-a510-4b8a10e17755`).
Tokens CSS canônicos: `frontend/src/design-system/tokens.css` (importar globalmente).

## Identidade
- **Estilo**: flat/clean — bordas em vez de sombras (sombra só em elementos flutuantes: toast, dialog, dropdown)
- **Fonte**: Geist (fallback system-ui). Base 14px.
- **Primary**: `#286CF0` (hover `#1F58C9` light / `#4784F5` dark)
- **Radius**: 8px em cards/botões/inputs, 6px em badges/pills
- **Dark mode**: via `:root[data-theme="dark"]` (tokens já cobrem)
- **Grid de espaçamento**: 4px (4/8/12/16/24/32)

## Padrões de componentes (medidas exatas do DS)

### Button
- Altura **36px**, padding `0 16px`, radius 8px, font `500 14px`, gap 8px p/ ícone
- Variantes: `solid` (primary bg, texto branco), `default` (surface + border-input, hover muted), `subtle` (bg muted), `ghost` (transparent, hover muted)
- Tamanhos: sm 30px/`0 12px`/13px · md 36px · lg 42px/`0 20px`
- Focus: `outline: 2px solid var(--color-primary); outline-offset: 2px`
- Transição: `background .12s, border-color .12s`

### Input / Select / Textarea
- Altura **36px**, padding `6px 12px`, border `1px solid var(--color-border-input)`, radius 8px
- Label: `13px/500`, cor `--color-text`, gap 6px acima do input
- Placeholder: `--color-text-soft`
- Focus: `outline: 2px solid primary; outline-offset: 1px; border-color: primary`
- Disabled: bg muted, opacity .6
- Select: appearance none + chevron SVG inline à direita

### Upload zone
- Border `1.5px dashed var(--color-border-input)`, radius 8px, padding 28px, centralizado
- Hover/drag: `border-color: primary; background: var(--color-primary-tint); color: primary`
- Lista de arquivos: rows com border, radius 8px, padding `8px 12px`, ícone em quadrado 28px bg muted radius 6px, check verde de sucesso

### Slider (input range)
- Track: 4px altura, radius 999px, bg `--color-track`
- Preenchimento: gradient primary com `background-size: var(--pct) 100%`
- Thumb: 16px círculo, bg surface, `border: 2px solid primary`
- Valor exibido: `13px`, `--color-text`, `font-variant-numeric: tabular-nums`
- Marks embaixo: 11px text-muted, flex space-between

### Progress
- Bar: 6px altura, radius 999px, track `--color-track`, fill com cor semântica
- Percent label: 13px, tabular-nums, alinhado à direita (36px width)
- Circle: SVG r=36, stroke-width 7, `stroke-linecap: round`, rotate -90°, label central `14px/600`

### Tabs
- Container com `border-bottom: 1px solid var(--color-border)`
- Tab: padding `12px 16px`, `600 14px`, cor `#535862`, `border-bottom: 2px solid transparent; margin-bottom: -1px`
- Ativa: cor primary + border-bottom primary. Usar `role=tablist/tab` + `aria-selected`

### Toast
- Stack fixo `top: 20px; right: 20px`, width 320px, gap 10px
- Card: surface + border, **border-left 4px** na cor semântica, radius 8px, shadow-float, padding `12px 14px`
- Ícone: círculo 20px na cor semântica, símbolo branco 12px/700
- Título `14px/600 --color-text`, msg `13px --color-text-muted`
- Animação entrada: `opacity 0 → 1, translateX(16px) → 0, .2s ease`; auto-dismiss 4s

### Dialog
- Overlay: `--color-overlay`, centrado, z-index 20
- Card: surface, radius 8px, `--shadow-dialog`, `width: min(440px, 92vw)`
- Header: `padding 20px 24px 0`, título `16px/600`, botão × text-muted
- Body: `padding 12px 24px`, `14px`, line-height 1.6
- Footer: `padding 16px 24px 24px`, botões à direita gap 10px
- Fechar: ×, cancel, overlay-click, Escape. `role=dialog aria-modal=true`

### Card
- `background: surface; border: 1px solid border; radius 8px; padding 16px`
- Label `14px text-muted`, valor `20px/600 text` line-height 28px

### Badge
- `inline-flex`, `12px/600`, radius 6px, padding `2px 8px`
- Semânticas: cor sólida no texto + `-bg` tint no fundo (ex.: success + success-bg)

## Seções/headings de painel
- Título de grupo: `12px/600 uppercase letter-spacing .06em text-muted`

## Uso em visualizações de áudio (canvas)
- Usar paleta `--chart-1..7` para cenas/efeitos
- Fundo do canvas escuro (#0A0A0A) independente do tema, com controles no chrome do app seguindo o tema
