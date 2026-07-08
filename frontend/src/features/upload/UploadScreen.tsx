/**
 * Tela inicial: UploadZone grande centrada (exibida quando não há áudio).
 * Valida via audio/validation, carrega no AudioEngine e mostra toasts.
 */
import { UploadZone, useToast } from "../../ui";
import { validateAudioFile } from "../../audio";
import { useAppStore } from "../../state";
import { useEngines } from "../engine/EngineContext";
import { getErrorMessage } from "../common/errors";

const ACCEPT = ".mp3,.wav,.ogg,.m4a";

export function UploadScreen() {
  const { getAudioEngine } = useEngines();
  const toast = useToast();
  const status = useAppStore((s) => s.status);
  const setDuration = useAppStore((s) => s.setDuration);
  const setAudioFileName = useAppStore((s) => s.setAudioFileName);
  const setCurrentTime = useAppStore((s) => s.setCurrentTime);
  const loading = status === "loading";

  async function handleFiles(files: File[]): Promise<void> {
    const file = files[0];
    if (!file || loading) {
      return;
    }
    const validation = validateAudioFile(file);
    if (!validation.ok) {
      toast.error("Arquivo inválido", validation.error);
      return;
    }
    try {
      const { duration, fileName } = await getAudioEngine().load(file);
      setCurrentTime(0);
      setDuration(duration);
      setAudioFileName(fileName);
      toast.success("Áudio carregado", `${fileName} pronto para reprodução.`);
    } catch (error: unknown) {
      toast.error(
        "Erro ao carregar áudio",
        getErrorMessage(error, "Não foi possível carregar o arquivo."),
      );
    }
  }

  return (
    <section className="upload-screen" aria-label="Envio de áudio">
      <div className="upload-screen__box">
        <h2 className="upload-screen__title">Comece com a sua música</h2>
        <p className="upload-screen__subtitle">
          Envie um arquivo de áudio para criar um vídeo com visualizações
          reativas ao som.
        </p>
        <UploadZone
          onFiles={(files) => {
            void handleFiles(files);
          }}
          accept={ACCEPT}
          title={
            loading
              ? "Carregando áudio…"
              : "Arraste sua música ou clique para selecionar"
          }
          hint="MP3, WAV, OGG ou M4A · máximo 50MB"
          onError={(message) => toast.error("Arquivo não aceito", message)}
          disabled={loading}
          label="Enviar arquivo de áudio"
          className="upload-screen__zone"
        />
      </div>
    </section>
  );
}
