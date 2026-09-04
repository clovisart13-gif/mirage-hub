/**
 * Banco Inter API v2 — integração mTLS + OAuth2
 * Docs: https://developers.inter.co/docs
 */
import https from "node:https";
import { logger } from "../lib/logger";

const BASE_URL = "https://cdpj.partners.bancointer.com.br";

interface InterCredentials {
  clientId: string;
  clientSecret: string;
  certCrt: string;  // Conteúdo PEM do .crt
  certKey: string;  // Conteúdo PEM do .key
}

export interface InterTransaction {
  dataEntrada: string;      // YYYY-MM-DD
  tipoTransacao: string;    // "CREDITO" | "DEBITO"
  tipoOperacao: string;     // PIX, TED, Boleto etc
  valor: number;
  titulo: string;
  descricao: string;
}

// ── helpers HTTP ─────────────────────────────────────────────────────────────

function makeAgent(crt: string, key: string) {
  return new https.Agent({ cert: crt, key, rejectUnauthorized: true });
}

function httpsRequest(options: https.RequestOptions, body?: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, data: raw }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── OAuth2 token (mTLS obrigatório) ─────────────────────────────────────────

async function getAccessToken(creds: InterCredentials): Promise<string> {
  const agent = makeAgent(creds.certCrt, creds.certKey);
  const body  = new URLSearchParams({
    grant_type:    "client_credentials",
    client_id:     creds.clientId,
    client_secret: creds.clientSecret,
    scope:         "extrato.read conta.read",
  }).toString();

  const parsed = new URL(`${BASE_URL}/oauth/v2/token`);
  const { status, data } = await httpsRequest({
    hostname: parsed.hostname,
    path:     parsed.pathname,
    method:   "POST",
    agent,
    headers: {
      "Content-Type":   "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
    },
  }, body);

  if (status !== 200) {
    throw new Error(`Inter token error ${status}: ${data}`);
  }
  const json = JSON.parse(data);
  return json.access_token as string;
}

// ── Extrato ──────────────────────────────────────────────────────────────────

export async function fetchInterExtrato(
  creds: InterCredentials,
  dataInicio: string,  // YYYY-MM-DD
  dataFim: string,
): Promise<InterTransaction[]> {
  const token = await getAccessToken(creds);
  const agent = makeAgent(creds.certCrt, creds.certKey);

  const qs    = new URLSearchParams({ dataInicio, dataFim, pagina: "0", tamanhoPagina: "500" });
  const parsed = new URL(`${BASE_URL}/banking/v2/extrato?${qs}`);

  const { status, data } = await httpsRequest({
    hostname: parsed.hostname,
    path:     parsed.pathname + parsed.search,
    method:   "GET",
    agent,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (status !== 200) {
    throw new Error(`Inter extrato error ${status}: ${data}`);
  }

  const json = JSON.parse(data);
  const transacoes: InterTransaction[] = json.transacoes ?? json.content ?? [];
  logger.info({ msg: "Inter extrato", count: transacoes.length, dataInicio, dataFim });
  return transacoes;
}

// ── Converter para formato interno ───────────────────────────────────────────

export function interToOFX(tx: InterTransaction): {
  data: string;
  descricao: string;
  valor: number;
  tipo: "CREDITO" | "DEBITO";
  fitId: string;
} {
  // dataEntrada vem como YYYY-MM-DD → dd/mm/yyyy
  const [ano, mes, dia] = tx.dataEntrada.split("-");
  const data = `${dia}/${mes}/${ano}`;

  // Tipo: "C" ou "CREDITO" → CREDITO
  const tipo: "CREDITO" | "DEBITO" =
    tx.tipoTransacao?.toUpperCase().startsWith("C") ? "CREDITO" : "DEBITO";

  const descricao = [tx.titulo, tx.descricao].filter(Boolean).join(" — ").slice(0, 200);

  // FITID sintético: data + valor + tipo (único o suficiente)
  const fitId = `INTER-${tx.dataEntrada}-${tipo}-${Math.abs(tx.valor).toFixed(2)}`;

  return { data, descricao, valor: Math.abs(tx.valor), tipo, fitId };
}
