/**
 * Bootstrap do servidor (porta 3001). Só chama listen quando executado
 * diretamente (ex.: `tsx src/server.ts`); testes importam buildApp.
 */
import { pathToFileURL } from "node:url";
import { buildApp } from "./app.js";

export { buildApp } from "./app.js";
export type { BuildAppOptions } from "./app.js";

export const PORT = 3001;
export const HOST = "0.0.0.0";

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
