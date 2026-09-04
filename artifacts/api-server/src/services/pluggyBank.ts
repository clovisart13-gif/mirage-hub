/**
 * Pluggy API — agregador Open Finance brasileiro
 * Suporta: Nubank, Bradesco, Itaú, Santander, BB, Sicoob e +200 bancos
 * Docs: https://docs.pluggy.ai
 */
import { logger } from "../lib/logger";

const BASE = "https://api.pluggy.ai";

export interface PluggyAccount {
  id: string;
  name: string;
  type: "BANK" | "CREDIT";
  subtype: string;
  number: string;
  balance: number;
  currencyCode: string;
}

export interface PluggyTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;       // ISO 8601
  type: "DEBIT" | "CREDIT";
  category: string | null;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

async function getApiKey(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(`${BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pluggy auth failed (${res.status}): ${err}`);
  }
  const json = await res.json() as { apiKey: string };
  return json.apiKey;
}

// ── Connect Token (usado pelo widget no frontend) ─────────────────────────────

export async function getConnectToken(
  clientId: string,
  clientSecret: string,
  itemId?: string,
): Promise<string> {
  const apiKey = await getApiKey(clientId, clientSecret);
  const body: Record<string, unknown> = {};
  if (itemId) body.itemId = itemId; // reconectar item existente

  const res = await fetch(`${BASE}/connect_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pluggy connect_token failed (${res.status}): ${err}`);
  }
  const json = await res.json() as { accessToken: string };
  return json.accessToken;
}

// ── Accounts ─────────────────────────────────────────────────────────────────

export async function getPluggyAccounts(
  clientId: string,
  clientSecret: string,
  itemId: string,
): Promise<PluggyAccount[]> {
  const apiKey = await getApiKey(clientId, clientSecret);
  const res = await fetch(`${BASE}/accounts?itemId=${itemId}`, {
    headers: { "X-API-KEY": apiKey },
  });
  if (!res.ok) throw new Error(`Pluggy accounts failed (${res.status})`);
  const json = await res.json() as { results: PluggyAccount[] };
  return json.results ?? [];
}

// ── Transactions ──────────────────────────────────────────────────────────────

export async function getPluggyTransactions(
  clientId: string,
  clientSecret: string,
  accountId: string,
  from: string,   // YYYY-MM-DD
  to: string,
): Promise<PluggyTransaction[]> {
  const apiKey = await getApiKey(clientId, clientSecret);

  let all: PluggyTransaction[] = [];
  let page = 1;
  const pageSize = 500;

  while (true) {
    const url = `${BASE}/transactions?accountId=${accountId}&from=${from}&to=${to}&pageSize=${pageSize}&page=${page}`;
    const res = await fetch(url, { headers: { "X-API-KEY": apiKey } });
    if (!res.ok) throw new Error(`Pluggy transactions failed (${res.status})`);
    const json = await res.json() as { results: PluggyTransaction[]; totalPages: number; page: number };
    all = all.concat(json.results ?? []);
    if (json.page >= json.totalPages) break;
    page++;
  }

  logger.info({ msg: "Pluggy transactions", accountId, from, to, count: all.length });
  return all;
}

// ── Converter para formato interno ───────────────────────────────────────────

export function pluggyToOFX(tx: PluggyTransaction, banco: string): {
  data: string;
  descricao: string;
  valor: number;
  tipo: "CREDITO" | "DEBITO";
  fitId: string;
} {
  // date: "2026-06-09T00:00:00.000Z" → "09/06/2026"
  const d = new Date(tx.date);
  const dia = String(d.getUTCDate()).padStart(2, "0");
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  const ano = d.getUTCFullYear();
  const data = `${dia}/${mes}/${ano}`;

  const tipo: "CREDITO" | "DEBITO" = tx.type === "CREDIT" ? "CREDITO" : "DEBITO";

  return {
    data,
    descricao: tx.description?.slice(0, 200) ?? "",
    valor: Math.abs(tx.amount),
    tipo,
    fitId: `PLUGGY-${banco}-${tx.id}`,
  };
}
