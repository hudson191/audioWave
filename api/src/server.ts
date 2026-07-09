/**
 * Bootstrap do servidor (porta 3001). Só chama listen quando executado
 * diretamente (ex.: `tsx src/server.ts`); testes importam buildApp.
 */
import { pathToFileURL } from "node:url";
import { buildApp } from "./app.js";

export { buildApp } from "./app.js";
export type { BuildAppOptions } from "./app.js";

export const PORT = Number(process.env.PORT) || 3001;
/**
 * API sem autenticação: por padrão escuta APENAS em loopback (o frontend
 * local acessa via proxy do Vite /api → 3001). Em container isolado, defina
 * HOST=0.0.0.0 para que o serviço web (nginx) alcance a API pela rede interna
 * do compose — SEM publicar a porta 3001 para o host (mantém-na privada).
 */
export const HOST = process.env.HOST ?? "127.0.0.1";

async function start(): Promise<void> {
  const app = await buildApp({ logger: true });
  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (error: unknown) {
    app.log.error(error, "Falha ao iniciar o servidor");
    process.exit(1);
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === pathToFileURL(entry).href;
}

if (isMainModule()) {
  void start();
}
