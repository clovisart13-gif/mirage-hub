/**
 * Segredo gerado uma vez no startup do processo.
 * Usado para autenticar chamadas HTTP internas (bridge → ATOS router)
 * sem depender do banco de dados. Compartilhado via import no mesmo processo.
 */
export const INTERNAL_SECRET = `int_${Math.random().toString(36).slice(2)}${Date.now()}`;
