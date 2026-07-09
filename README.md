# audioWave

Gerador de vídeo musical no navegador: envie uma música, escolha visualizações
reativas ao som e exporte um vídeo `.webm` com áudio — tudo client-side.

![stack](https://img.shields.io/badge/React%2019-TypeScript-286CF0) ![api](https://img.shields.io/badge/Fastify-Zod-00A85B)

## Funcionalidades

- **Upload de áudio** (MP3/WAV/OGG/M4A, até 50MB) com drag-and-drop
- **Análise em tempo real** via Web Audio API: FFT, bandas (grave/médio/agudo),
  RMS e **detecção de beats/BPM** (algoritmo sound-energy: `média + 1.5×desvio`
  em janela móvel de 1s, refratário 250ms, BPM pela mediana dos intervalos)
- **3 cenas** Canvas 2D reativas: Barras, Osciloscópio radial e Partículas
- **4 paletas** (Eyris, Violeta, Esmeralda, Pôr do sol) + sliders de
  sensibilidade/intensidade + presets servidos pela API
- **Timeline**: blocos que definem qual cena aparece em cada trecho do vídeo
- **Export de vídeo**: `canvas.captureStream(60)` + áudio pré-gain →
  MediaRecorder (WebM VP9/Opus, 720p/1080p), com progresso e download automático
- **Projetos**: salvar/abrir/excluir via API REST; estado do editor persistido
  em localStorage (autosave com debounce)
- **Dark/light mode** sem flash (tema aplicado antes do primeiro paint)
- Acessibilidade: focus trap em dialogs, tabs com navegação por setas,
  aria-labels nos controles, tabpanels associados

## Design system

UI segue o **Eyris Design System** (claude.ai/design) — flat/clean, fonte Geist
self-hosted, tokens CSS em `frontend/src/design-system/tokens.css` e medidas de
referência em `design-system/REFERENCE.md`.

## Estrutura

```
frontend/   Vite + React 19 + TS + Zustand (porta 5173, proxy /api → 3001)
  src/audio/    motor de áudio (engine, análise, beats) — puro e testável
  src/render/   motor de render + cenas + paletas
  src/state/    store Zustand, timeline utils, persistência
  src/api/      client REST tipado
  src/ui/       componentes Eyris (Button, Dialog, Tabs, Toast, ...)
  src/features/ composição (upload, player, visualizer, controles, export)
api/        Fastify + Zod + repository JSON (porta 3001)
CONTRACTS.md  contratos entre módulos
```

## Rodando

```bash
# API (terminal 1)
cd api && npm install && npm run dev        # http://localhost:3001

# Frontend (terminal 2)
cd frontend && npm install && npm run dev   # http://localhost:5173
```

O editor funciona mesmo com a API offline (presets/projetos ficam desativados).

## Testes

```bash
cd api && npm test          # 92 testes (rotas, schemas, repositório)
cd frontend && npm test     # 322 testes (unit + Testing Library)
npm run typecheck           # em ambos
```

## API

Envelope padrão `{ success, data, error }` em todas as respostas.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | healthcheck |
| GET | `/api/presets` | presets visuais (read-only) |
| GET/POST | `/api/projects` | listar / criar projeto |
| GET/PUT/DELETE | `/api/projects/:id` | ler / atualizar / remover |
