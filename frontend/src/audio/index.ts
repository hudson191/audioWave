/** Barrel do motor de áudio (frontend/src/audio). */

export { AudioEngine, FFT_SIZE, ANALYSER_SMOOTHING } from "./audioEngine";
export { computeBands, computeRms, smooth, BAND_RANGES_HZ } from "./analysis";
export type { FrequencyBands } from "./analysis";
export { BeatDetector, detectBeats } from "./beatDetector";
export type { BeatResult } from "./beatDetector";
export {
  createOfflineFrameSource,
  extractMono,
} from "./offlineAnalysis";
export type { OfflineFrameSource } from "./offlineAnalysis";
export {
  validateAudioFile,
  extractExtension,
  MAX_AUDIO_FILE_BYTES,
  ALLOWED_AUDIO_EXTENSIONS,
} from "./validation";
export type { AudioFileInfo, AudioFileValidationResult } from "./validation";
