/**
 * O tsconfig.json do workspace usa `"types": []`, o que exclui os tipos
 * globais do Node. Esta referência explícita reativa os tipos de
 * `@types/node` para todo o programa sem alterar arquivos de config.
 */
/// <reference types="node" />
