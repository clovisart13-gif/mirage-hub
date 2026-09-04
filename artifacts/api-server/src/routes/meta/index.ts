import { Router } from "express";
import type { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { supabaseAdmin } from "../../lib/supabase";
import { chamarMarcosDireto } from "../../lib/marcosProvider";
import { chamarJoanaDireto } from "../../lib/joanaProvider";
import { chamarLiaDireto } from "../../lib/liaProvider";
import { chamarCaioDireto } from "../../lib/caioProvider";

const router = Router();

const META_GRAPH_VERSION = "v20.0";
const N8N_POSTFUNNEL_URL =
  "https://clovisart13.app.n8n.cloud/webhook/mirage-zapi-postfunnel-router";

// ── Helpers ──────────────────────────────────────────────────────────────────

const slugToUuidCache = new Map<string, { id: string; ts: number }>();
async function resolveSlugToUuid(slug: string): Promise<string> {
  if (slug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i)) return slug;
  const cached = slugToUuidCache.get(slug);
  if (cached && Date.now() - cached.ts < 300_000) return cached.id;
  const { data } = await supabaseAdmin.from("tenants").select("id").eq("slug", slug).single();
  const id = data?.id ?? slug;
  slugToUuidCache.set(slug, { id, ts: Date.now() });
  return id;
}

const seenIds = new Map<string, number>();
const SEEN_TTL_MS = 5 * 60 * 1000;
function isDuplicate(messageId: string): boolean {
  const now = Date.now();
  for (const [k, ts] of seenIds) {
    if (now - ts > SEEN_TTL_MS) seenIds.delete(k);
  }
  if (seenIds.has(messageId)) return true;
  seenIds.set(messageId, now);
  return false;
}

// ── Core send via Meta Cloud API ─────────────────────────────────────────────

export async function sendMetaMessage(
  phone: string,
  message: string
): Promise<{ ok: boolean; error?: string; response?: unknown }> {
  const phoneNumberId = process.env["META_PHONE_NUMBER_ID"];
  const accessToken   = process.env["META_ACCESS_TOKEN"];

  if (!phoneNumberId || !accessToken) {
    return { ok: false, error: "META_PHONE_NUMBER_ID ou META_ACCESS_TOKEN não configurados" };
  }

  const phoneCleaned = phone.replace(/[\s\-+()]/g, "");

  const res = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneCleaned,
        type: "text",
        text: { preview_url: false, body: message },
      }),
    }
  );

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    logger.warn({ phone: phoneCleaned, status: res.status, body }, "meta/send: Graph API erro");
    return { ok: false, error: `Graph API ${res.status}`, response: body };
  }

  return { ok: true, response: body };
}

// ── GET /api/meta/webhook — verificação do webhook pela Meta ─────────────────
//
// A Meta envia um GET com hub.mode=subscribe, hub.verify_token e hub.challenge.
// Respondemos com hub.challenge para confirmar o endpoint.
// Configure META_VERIFY_TOKEN no painel do Meta Business Manager.

router.get("/meta/webhook", (req: Request, res: Response) => {
  const mode        = req.query["hub.mode"];
  const token       = req.query["hub.verify_token"];
  const challenge   = req.query["hub.challenge"];
  const verifyToken = process.env["META_VERIFY_TOKEN"];

  if (!verifyToken) {
    logger.warn("meta/webhook GET: META_VERIFY_TOKEN não configurado");
    res.status(503).send("META_VERIFY_TOKEN não configurado");
    return;
  }

  if (mode === "subscribe" && token === verifyToken) {
    logger.info("meta/webhook: verificação de webhook aprovada");
    res.status(200).send(challenge);
  } else {
    logger.warn({ mode, token }, "meta/webhook: token de verificação inválido");
    res.status(403).send("Forbidden");
  }
});

// ── POST /api/meta/webhook — recebe mensagens da API Oficial ─────────────────
//
// Só processa quando META_OFFICIAL_ENABLED=true.
// Normaliza o payload da Meta (diferente do Z-API) e roteapara os mesmos agentes.
//
// Formato do payload Meta:
//   { object, entry: [{ changes: [{ field, value: { messages, contacts, metadata } }] }] }

router.post("/meta/webhook", async (req: Request, res: Response) => {
  res.status(200).json({ ok: true });

  if (process.env["META_OFFICIAL_ENABLED"] !== "true") {
    return;
  }

  const body = req.body as Record<string, unknown>;

  if ((body.object as string) !== "whatsapp_business_account") return;

  const entries = (body.entry as any[]) ?? [];

  for (const entry of entries) {
    const changes = (entry.changes as any[]) ?? [];
    for (const change of changes) {
      if (change.field !== "messages") continue;

      const value    = change.value as Record<string, any>;
      const messages = (value.messages as any[]) ?? [];
      const contacts = (value.contacts as any[]) ?? [];

      for (const msg of messages) {
        try {
          if (msg.type !== "text") continue;

          const phone       = String(msg.from ?? "");
          const messageId   = String(msg.id ?? "");
          const messageText = (msg.text?.body as string) ?? "";
          const timestamp   = parseInt(msg.timestamp ?? "0", 10) * 1000;

          const contact   = contacts.find((c: any) => c.wa_id === phone);
          const senderName = contact?.profile?.name ?? "Lead";

          const tenantSlug = (req.query.tenant as string) || "r2pb";

          if (!messageText) continue;
          if (isDuplicate(messageId)) {
            logger.debug({ phone, messageId }, "meta/webhook: messageId duplicado, ignorado");
            continue;
          }

          const tenantUuid = await resolveSlugToUuid(tenantSlug);

          // ── Human-in-control guard ───────────────────────────────────────
          const phoneDigits   = phone.replace(/\D/g, "");
          const phoneWith55   = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;
          const phoneWithout55 = phoneWith55.slice(2);

          const hicRows = await db.execute(
            sql`SELECT 1 FROM lead_conversation_state
                WHERE tenant_id = ${tenantUuid}
                  AND phone IN (${phoneWith55}, ${phoneWithout55})
                  AND human_in_control = true
                LIMIT 1`
          );
          if ((hicRows.rows as unknown[]).length > 0) {
            logger.info({ tenantSlug, phone, messageId }, "meta/webhook: human_in_control=true → IA BLOQUEADA");
            continue;
          }

          // ── Verifica agente atribuído ────────────────────────────────────
          const stateRows = await db.execute(
            sql`SELECT current_agent, lead_name FROM lead_conversation_state
                WHERE tenant_id = ${tenantUuid}
                  AND phone IN (${phoneWith55}, ${phone})
                LIMIT 1`
          );
          const stateRow    = (stateRows.rows as any[])[0];
          const currentAgent = stateRow?.current_agent as string | null;
          const leadNameDb   = (stateRow?.lead_name as string) || senderName;

          const sendReply = async (reply: string, agentLabel: string) => {
            const result = await sendMetaMessage(phone, `${reply}\n\n_— ${agentLabel}_`);
            if (!result.ok) {
              logger.warn({ phone, error: result.error }, "meta/webhook: falha ao enviar via Meta API");
            }
          };

          if (currentAgent && currentAgent !== "carla") {
            logger.info({ tenantSlug, phone, currentAgent }, `[MULTIAGENTE] meta/webhook → roteando para ${currentAgent}`);

            if (currentAgent === "marcos") {
              const r = await chamarMarcosDireto({ phone, message: messageText, leadName: leadNameDb, tenantId: tenantSlug });
              if (r.ok && r.reply) await sendReply(r.reply, "MARCOS | R2PB Parceiros");
            } else if (currentAgent === "joana") {
              const r = await chamarJoanaDireto({ phone, message: messageText, leadName: leadNameDb, tenantId: tenantSlug });
              if (r.ok && r.reply) await sendReply(r.reply, "JOANA | R2PB");
            } else if (currentAgent === "lia") {
              const r = await chamarLiaDireto({ phone, message: messageText, leadName: leadNameDb, tenantId: tenantSlug });
              if (r.ok && r.reply) await sendReply(r.reply, "LIA | Suporte R2PB");
            } else if (currentAgent === "admin") {
              const r = await chamarCaioDireto({ phone, message: messageText, leadName: leadNameDb, tenantId: tenantSlug });
              if (r.ok && r.reply) await sendReply(r.reply, "CAIO | Administrativo R2PB");
            }
            continue;
          }

          // ── Sem agente → encaminha para n8n POSTFUNNEL ──────────────────
          logger.info({ tenantSlug, phone, senderName, messageId }, "meta/webhook: sem agente → POSTFUNNEL");

          await fetch(N8N_POSTFUNNEL_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "ReceivedCallback",
              company_slug: tenantSlug,
              phone,
              text: { message: messageText },
              lead_name: senderName,
              source: "meta_official",
              event_type: "MESSAGE_RECEIVED",
              channel: "whatsapp_meta_official",
              momment: timestamp || Date.now(),
              isGroup: false,
              fromMe: false,
              messageId,
            }),
            signal: AbortSignal.timeout(15_000),
          }).catch((err) =>
            logger.warn({ error: err?.message }, "meta/webhook: falha ao acionar POSTFUNNEL")
          );

        } catch (msgErr: any) {
          logger.error({ err: msgErr?.message }, "meta/webhook: erro ao processar mensagem");
        }
      }
    }
  }
});

export default router;
