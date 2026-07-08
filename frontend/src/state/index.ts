export {
  useAppStore,
  DEFAULT_SETTINGS,
  DEFAULT_SCENE_ID,
  DEFAULT_VOLUME,
} from "./store";
export type { AppState } from "./store";

export {
  sortBlocks,
  blocksOverlap,
  sceneIdAt,
  validateBlock,
  insertBlock,
  clampBlock,
} from "./timelineUtils";
export type { TimelineResult } from "./timelineUtils";

export {
  initPersistence,
  loadEditorState,
  saveEditorState,
  parsePersisted,
  STORAGE_KEY,
  PERSIST_VERSION,
  AUTOSAVE_DEBOUNCE_MS,
} from "./persistence";
export type { PersistedEditorState } from "./persistence";
