# audioWave — Contratos entre módulos

Este arquivo define as interfaces compartilhadas. **Todo módulo DEVE conformar com estes contratos.**
Tipos canônicos do frontend: `frontend/src/shared/types.ts` (não alterar assinaturas; adicionar campos requer atualizar aqui).

## Visão geral

Gerador de vídeo musical (estilo musicvid.org): usuário faz upload de áudio, escolhe cena/preset
visual reativo ao áudio, dá preview sincronizado e exporta vídeo (canvas.captureStream + MediaRecorder).

```
/api        Fastify + TS — persistência de projetos e presets (REST, porta 3001)
/frontend   Vite + React 18 + TS + Zustand — app (porta 5173, proxy /api → 3001)
```

## Estrutura de pastas e DONOS (fronteiras rígidas de escrita)

| Pasta | Dono | Conteúdo |
|---|---|---|
| `api/**` | agente API | servidor Fastify completo |
| `frontend/src/ui/**` | agente UI-kit | componentes Eyris (Button, Input, Slider, Tabs, Toast, Dialog, Progress, UploadZone, Badge, Card, Select) |
| `frontend/src/audio/**` | agente Audio | engine de áudio (decode, playback, análise, beats) |
| `frontend/src/render/**` | agente Render | motor de render + cenas canvas |
| `frontend/src/state/**` + `frontend/src/api/**` | agente State | store Zustand + client REST |
| `frontend/src/features/**`, `frontend/src/App.tsx`, `frontend/src/App.css` | agente Integração (fase 2) | telas e composição |
| `frontend/src/shared/types.ts`, `frontend/src/design-system/tokens.css` | JÁ ESCRITOS — ninguém altera | contratos + tokens |

## Contratos TypeScript (frontend/src/shared/types.ts)

```ts
/** Dados de áudio entregues a cada frame de render */
export interface AudioFrame {
  frequency: Uint8Array;              // bins FFT (0-255), length = fftSize/2
  waveform: Uint8Array;               // time-domain (0-255), length = fftSize
  bands: { bass: number; mid: number; treble: number }; // normalizados 0-1, suavizados
  level: number;                      // RMS 0-1
  beat: boolean;                      // true no frame em que um beat foi detectado
  bpm: number | null;                 // estimativa corrente (null até estabilizar)
  time: number;                       // posição de playback em segundos
  duration: number;                   // duração total em segundos
}

/** Paleta passada às cenas (derivada dos tokens --chart-*) */
export interface ScenePalette {
  primary: string; secondary: string; accent: string;
  colors: string[];                   // paleta completa p/ partículas etc.
  background: string;                 // fundo do canvas
}

export interface SceneContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;                      // CSS px (o motor cuida do DPR)
  height: number;
  palette: ScenePalette;
}

/** Cena plugável. Registrada em render/sceneRegistry.ts */
export interface Scene {
  readonly id: string;                // ex.: "bars", "waveform", "particles"
  readonly name: string;              // nome exibido
  init(sc: SceneContext): void;
  /** chamada a cada rAF: atualiza e desenha. dt em segundos. */
  update(frame: AudioFrame, dt: number): void;
  /** re-init leve após resize (motor chama com novo SceneContext) */
  resize(sc: SceneContext): void;
  dispose(): void;
}

export interface SceneSettings {
  sensitivity: number;                // 0.1–3, default 1
  intensity: number;                  // 0.1–2, default 1  (densidade/escala do efeito)
  paletteId: string;                  // id do preset de paleta
}

export interface VisualPreset {
  id: string;
  name: string;
  sceneId: string;
  settings: SceneSettings;
}

export interface TimelineBlock {
  id: string;
  sceneId: string;
  start: number;                      // segundos
  end: number;                        // segundos (exclusive)
}

/** Projeto persistido na API */
export interface Project {
  id: string;
  name: string;
  audioFileName: string | null;
  presetId: string;
  settings: SceneSettings;
  timeline: TimelineBlock[];
  createdAt: string;                  // ISO
  updatedAt: string;                  // ISO
}

export type ProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt">;

/** Envelope padrão de resposta da API */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export type PlaybackStatus = "idle" | "loading" | "ready" | "playing" | "paused" | "ended";
export type ExportStatus = "idle" | "recording" | "processing" | "done" | "error";
```

## API REST (porta 3001, prefixo /api)

Envelope: `{ success, data, error }` em TODAS as respostas. Validação com Zod. CORS liberado p/ localhost:5173.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | `{ status: "ok" }` em data |
| GET | `/api/presets` | `VisualPreset[]` (seed embutido, read-only) |
| GET | `/api/projects` | `Project[]` |
| POST | `/api/projects` | body `ProjectInput` → `Project` criado (201) |
| GET | `/api/projects/:id` | `Project` ou 404 |
| PUT | `/api/projects/:id` | body `ProjectInput` parcial → `Project` atualizado |
| DELETE | `/api/projects/:id` | 200 `{ success: true, data: null }` ou 404 |

Storage: Repository pattern com implementação JSON-file (`api/data/projects.json`), imutável (spread, nunca mutação).
Erros: 400 validação (mensagem clara), 404 não encontrado, 500 com log detalhado no server e mensagem genérica no client.

## Motor de áudio (frontend/src/audio/) — API pública

```ts
export class AudioEngine {
  load(file: File): Promise<{ duration: number; fileName: string }>; // decode + valida (mp3/wav/ogg/m4a, máx 50MB)
  play(): void; pause(): void; seek(seconds: number): void;
  setVolume(v: number): void;                    // 0-1
  getFrame(): AudioFrame;                        // snapshot p/ o frame corrente
  getStatus(): PlaybackStatus;
  onStatusChange(cb: (s: PlaybackStatus) => void): () => void; // retorna unsubscribe
  onEnded(cb: () => void): () => void;
  /** stream de áudio p/ export (MediaStreamAudioDestinationNode) */
  getMediaStream(): MediaStream;
  dispose(): void;
}
export function detectBeats(/* pure helpers testáveis */)...
```

Análise: AnalyserNode fftSize 2048, smoothingTimeConstant 0.8. Bandas: bass 20–250Hz, mid 250–4kHz, treble 4k–16kHz.
Beat: energia dos graves vs média móvel (janela ~1s) com threshold adaptativo + refratário 250ms. Helpers puros em arquivos separados com testes.

## Motor de render (frontend/src/render/) — API pública

```ts
export class RenderEngine {
  constructor(canvas: HTMLCanvasElement, opts: { palette: ScenePalette });
  setScene(sceneId: string): void;               // via sceneRegistry
  setSettings(s: SceneSettings): void;
  setPalette(p: ScenePalette): void;
  start(getFrame: () => AudioFrame): void;       // rAF loop, cuida de DPR/resize
  stop(): void;
  dispose(): void;
}
export const sceneRegistry: { list(): {id,name}[]; create(id: string): Scene };
export const PALETTES: Record<string, ScenePalette>; // >= 4 paletas dos tokens --chart-*
```

Cenas obrigatórias (mínimo): `bars` (barras de frequência), `waveform` (osciloscópio radial ou linear), `particles` (partículas reativas ao grave com pulso no beat). Canvas 2D, 60fps, additive glow onde couber. `sensitivity` multiplica a resposta ao áudio; `intensity` escala densidade/tamanho.

## Store Zustand (frontend/src/state/) — shape

```ts
interface AppState {
  // áudio
  audioFileName: string | null; duration: number; status: PlaybackStatus;
  currentTime: number; volume: number;
  // visual
  sceneId: string; settings: SceneSettings; presets: VisualPreset[];
  // timeline
  timeline: TimelineBlock[];
  // projeto
  project: Project | null; projects: Project[];
  // export
  exportStatus: ExportStatus; exportProgress: number; // 0-1
  // ações (sempre imutáveis) — setters + async: loadPresets(), saveProject(), loadProjects(), deleteProject(id)
}
```

Client REST em `frontend/src/api/client.ts`: fetch com envelope tipado, base `/api` (proxy Vite → 3001), erros lançam `ApiError` com mensagem amigável.

## Regras globais

- Imutabilidade SEMPRE (nunca mutar objetos/arrays; spread)
- Arquivos ≤ 400 linhas, funções < 50 linhas, sem nesting > 4
- Validação em toda boundary (upload, API, localStorage)
- Erros: mensagens amigáveis na UI, detalhe no console/server
- Testes Vitest para lógica pura (análise, beats, repositório, rotas, store, utils); componentes-chave com Testing Library
- Design: SEGUIR `design-system/REFERENCE.md` à risca — tokens via `var(--...)`, nada de cores hardcoded na UI (canvas usa palette)
- Sem novas dependências npm além das já instaladas (three NÃO está instalado — cenas são Canvas 2D)
