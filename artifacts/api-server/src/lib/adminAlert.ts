/**
 * adminAlert — canal centralizado de alertas para o admin da Mirage.
 *
 * Prioridade:
 *  1. Z-API (WhatsApp) via ZAPI_INSTANCE_ADMIN + ZAPI_TOKEN_ADMIN
 *  2. E-mail via Resend (RESEND_API_KEY + ALERT_EMAIL_ADMIN)
 *  3. Log estruturado de alta visibilidade (sem canal configurado)
 *
 * ⚠️ Nunca usa credenciais de tenant. Sempre env vars do canal Mirage Admin.
 */

import { pino } from "pino";

const logger = pino({ name: "adminAlert" });

const ADMIN_PHONE   = process.env["ALERT_PHONE_ADMIN"]      ?? "";
const ADMIN_EMAIL   = process.env["ALERT_EMAIL_ADMIN"]      ?? "";
const ZAPI_INSTANCE = process.env["ZAPI_INSTANCE_ADMIN"]    ?? "";
const ZAPI_TOKEN    = process.env["ZAPI_TOKEN_ADMIN"]       ?? "";
const ZAPI_CLIENT   = process.env["ZAPI_CLIENT_TOKEN_ADMIN"] ?? "";
const RESEND_KEY    = process.env["RESEND_API_KEY"]         ?? "";

export async function sendAdminAlert(source: string, message: string): Promise<void> {
  // ── Canal 1: Z-API (WhatsApp) ──────────────────────────────────────────────
  if (ZAPI_INSTANCE && ZAPI_TOKEN) {
    try {
      const res = await fetch(
        `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(ZAPI_CLIENT ? { "Client-Token": ZAPI_CLIENT } : {}),
          },
          body: JSON.stringify({ phone: ADMIN_PHONE, message }),
          signal: AbortSignal.timeout(10_000),
        }
      );
      if (res.ok) {
        logger.info({ source, phone: ADMIN_PHONE }, "[AdminAlert] ✅ WhatsApp enviado");
        return;
      }
      logger.warn({ source, status: res.status }, "[AdminAlert] Z-API retornou erro — tentando fallback");
    } catch (err: any) {
      logger.warn({ source, err: err?.message }, "[AdminAlert] Falha Z-API — tentando fallback");
    }
  }

  // ── Canal 2: Resend (e-mail) ───────────────────────────────────────────────
  if (RESEND_KEY && ADMIN_EMAIL) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Mirage Alertas <alertas@gestaomirage.com.br>",
          to: ADMIN_EMAIL,
          subject: `⚠️ Alerta Mirage — ${source}`,
          text: message,
        }),
      });
      if (res.ok) {
        logger.info({ source, to: ADMIN_EMAIL }, "[AdminAlert] ✅ E-mail enviado via Resend");
        return;
      }
      logger.warn({ source, status: res.status }, "[AdminAlert] Resend retornou erro");
    } catch (err: any) {
      logger.warn({ source, err: err?.message }, "[AdminAlert] Falha Resend");
    }
  }

  // ── Sem canal configurado — log de alta visibilidade ──────────────────────
  logger.error(
    { source, message },
    "⚠️⚠️⚠️ [ADMIN_ALERT — SEM CANAL] Configure ZAPI_INSTANCE_ADMIN+ZAPI_TOKEN_ADMIN " +
    "ou RESEND_API_KEY+ALERT_EMAIL_ADMIN nos secrets para receber alertas fora do log."
  );
}
