/**
 * Monitor automático do webhook Helena.
 *
 * Problema: a Helena (WTS) desativa webhooks automaticamente quando o endpoint
 * começa a falhar (ex: URL mudou, servidor reiniciou). Isso para silenciosamente
 * toda a automação Pro → Pós-venda sem nenhum aviso.
 *
 * Solução: este job roda a cada 30 minutos e verifica se o webhook está "vivo"
 * (se recebemos algum evento recentemente). Se estiver morto, envia alerta
 * WhatsApp para o admin via Z-API e loga loudly.
 */

import * as fs from "node:fs";
import { logger } from "../lib/logger";

// ── Configuração ─────────────────────────────────────────────────────────────

// Arquivo de persistência — sobrevive a hot-reloads e reinícios rápidos
const HEARTBEAT_FILE = "/tmp/helena_webhook_heartbeat";

// Janela de silêncio máximo antes de alertar (ms) — 2 horas
const MAX_SILENCE_MS = 2 * 60 * 60 * 1000;

// Intervalo de verificação (ms) — 30 minutos
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

// Intervalo mínimo entre alertas (ms) — 3 horas (evita spam)
const MIN_ALERT_INTERVAL_MS = 3 * 60 * 60 * 1000;

// ⚠️ Canal administrativo da Mirage — configurar ZAPI_INSTANCE_ADMIN / ZAPI_TOKEN_ADMIN nos secrets.
// Se não configurados, alertas são emitidos apenas no log (sem WhatsApp via Z-API).
const ZAPI_INSTANCE_ID = process.env["ZAPI_INSTANCE_ADMIN"] ?? "";
const ZAPI_TOKEN       = process.env["ZAPI_TOKEN_ADMIN"]    ?? "";

// Número pessoal do admin que recebe o alerta (Clovis) — configurável via env
const ADMIN_PHONE = process.env.ALERT_PHONE_ADMIN ?? "5511969243563";

// ── Estado em memória ─────────────────────────────────────────────────────────

let lastEventAt: number = readHeartbeatFromFile();
let lastAlertSentAt: number = 0;
let monitorInterval: ReturnType<typeof setInterval> | null = null;

// ── Heartbeat ─────────────────────────────────────────────────────────────────

function readHeartbeatFromFile(): number {
  try {
    const raw = fs.readFileSync(HEARTBEAT_FILE, "utf-8").trim();
    const ts = parseInt(raw, 10);
    return Number.isFinite(ts) && ts > 0 ? ts : 0;
  } catch {
    return 0;
  }
}

function writeHeartbeatToFile(ts: number): void {
  try {
    fs.writeFileSync(HEARTBEAT_FILE, String(ts), "utf-8");
  } catch {
    // não fatal
  }
}

/**
 * Chamado pelo webhook handler da Helena em cada evento recebido.
 * Atualiza o timestamp de "última vez que vimos algo".
 */
export function recordHelenaHeartbeat(): void {
  const now = Date.now();
  lastEventAt = now;
  writeHeartbeatToFile(now);
}

// ── Envio de alerta admin (Z-API → Resend → log) ─────────────────────────────

async function sendWhatsAppAlert(message: string): Promise<boolean> {
  const { sendAdminAlert } = await import("../lib/adminAlert");
  await sendAdminAlert("HelenaMonitor", message);
  return true;
}

// ── Verificação periódica ─────────────────────────────────────────────────────

async function checkHelenaWebhookHealth(): Promise<void> {
  // Recarrega heartbeat do arquivo (útil se o servidor reiniciou)
  const fileTs = readHeartbeatFromFile();
  if (fileTs > lastEventAt) {
    lastEventAt = fileTs;
  }

  const now = Date.now();

  // Se lastEventAt for 0 (nunca recebemos nada desde o deploy),
  // só começamos a alertar depois de 4 horas (evita falso alarme no boot)
  if (lastEventAt === 0) {
    // Usamos o timestamp de start do processo como referência
    const uptimeMs = process.uptime() * 1000;
    if (uptimeMs < 4 * 60 * 60 * 1000) {
      logger.info("[HelenaMonitor] nenhum evento ainda — aguardando 4h de uptime antes de alertar");
      return;
    }
  }

  const silenceMs = lastEventAt > 0 ? now - lastEventAt : now;
  const silenceHours = (silenceMs / 3_600_000).toFixed(1);

  // Dentro do limite — tudo bem
  if (silenceMs < MAX_SILENCE_MS) {
    const lastFormatted = lastEventAt > 0
      ? new Date(lastEventAt).toISOString()
      : "nunca";
    logger.info(
      { lastEventAt: lastFormatted, silenceHours },
      "[HelenaMonitor] ✅ webhook Helena saudável"
    );
    return;
  }

  // Webhook está silencioso — logar com urgência
  logger.error(
    { silenceHours, lastEventAt: lastEventAt > 0 ? new Date(lastEventAt).toISOString() : "nunca" },
    "[HelenaMonitor] ⚠️ ALERTA: webhook Helena inativo por mais de 2 horas!"
  );

  // Evita spam de alertas — só manda se passou MIN_ALERT_INTERVAL desde o último
  const sinceLastAlert = now - lastAlertSentAt;
  if (lastAlertSentAt > 0 && sinceLastAlert < MIN_ALERT_INTERVAL_MS) {
    const nextAlertIn = Math.ceil((MIN_ALERT_INTERVAL_MS - sinceLastAlert) / 60_000);
    logger.info({ nextAlertIn }, "[HelenaMonitor] alerta suprimido — aguardando cooldown (min)");
    return;
  }

  const lastStr = lastEventAt > 0
    ? `Último evento: ${new Date(lastEventAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
    : "Nenhum evento recebido desde o último reinício";

  const alertMsg = [
    "🚨 *ALERTA MIRAGE HUB*",
    "",
    "O webhook da *Helena (WTS)* está inativo há " + silenceHours + "h.",
    "",
    lastStr,
    "",
    "⚠️ Leads movidos para GANHO no Pipeline PRO *não estão sendo migrados automaticamente* para Pós-venda.",
    "",
    "👉 Acesse: *Helena → Ajustes → Webhooks*",
    "Encontre o webhook 'replit' e reative-o.",
    "",
    "URL correta:",
    `https://${(process.env.REPLIT_DOMAINS ?? "").split(",")[0].trim()}/api/helena/webhook?tenant=r2pb`,
  ].join("\n");

  const sent = await sendWhatsAppAlert(alertMsg);
  if (sent) {
    lastAlertSentAt = now;
  }
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Inicia o monitor em background. Chamar uma vez no startup do servidor.
 */
export function startHelenaWebhookMonitor(): void {
  if (monitorInterval) return; // já iniciado

  logger.info(
    { checkIntervalMin: CHECK_INTERVAL_MS / 60_000, maxSilenceHours: MAX_SILENCE_MS / 3_600_000 },
    "[HelenaMonitor] monitor iniciado"
  );

  // Primeira verificação após 5 minutos (deixa servidor subir)
  setTimeout(() => {
    checkHelenaWebhookHealth().catch(e =>
      logger.error({ error: e?.message }, "[HelenaMonitor] erro na verificação inicial")
    );
  }, 5 * 60 * 1000);

  // Verificações periódicas
  monitorInterval = setInterval(() => {
    checkHelenaWebhookHealth().catch(e =>
      logger.error({ error: e?.message }, "[HelenaMonitor] erro na verificação periódica")
    );
  }, CHECK_INTERVAL_MS);
}

/**
 * Retorna o status atual do heartbeat (para diagnóstico via endpoint).
 */
export function getHelenaWebhookStatus(): {
  lastEventAt: string | null;
  silenceHours: number;
  healthy: boolean;
} {
  const now = Date.now();
  const fileTs = readHeartbeatFromFile();
  const effective = Math.max(lastEventAt, fileTs);
  const silenceMs = effective > 0 ? now - effective : now;

  return {
    lastEventAt: effective > 0 ? new Date(effective).toISOString() : null,
    silenceHours: parseFloat((silenceMs / 3_600_000).toFixed(2)),
    healthy: silenceMs < MAX_SILENCE_MS,
  };
}
