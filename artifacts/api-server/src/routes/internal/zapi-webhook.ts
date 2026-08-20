import { Router } from "express";
import type { Request, Response } from "express";
import { createHmac } from "node:crypto";
import { eq, desc, and } from "drizzle-orm";
import { db, salesAutomationConfig, leadAiEvents } from "@workspace/db";
import { supabaseAdmin } from "../../lib/supabase";
import { logger } from "../../lib/logger";

const router = Router();

type ZapiInstance = {
  canal?: string;
  instanceId?: string;
  token?: string;
  clientToken?: string;
  usos?: string[];
};

const MIRAGE_TENANT = "mirage";

function getMirageEnvInstance(): ZapiInstance | null {
  const instanceId = process.env["ZAPI_INSTANCE_MIRAGE"]?.trim();
  const token = process.env["ZAPI_TOKEN_MIRAGE"]?.trim();
  const clientToken = process.env["ZAPI_CLIENT_TOKEN_MIRAGE"]?.trim();
  if (!instanceId || !token || !clientToken) return null;
  return {
    canal: "zapi",
    instanceId,
    token,
    clientToken,
    usos: ["mirage"],
  };
}

function mirageInboundWebhookUrl(): string | null {
  const origin = process.env["MIRAGE_WEBHOOK_PUBLIC_ORIGIN"]?.trim().replace(/\/$/, "");
  const internalKey = process.env["MARKETING_INTERNAL_API_KEY"]?.trim();
  const instanceId = process.env["ZAPI_INSTANCE_MIRAGE"]?.trim();
  if (!origin || !internalKey || !instanceId) return null;

  const proof = createHmac("sha256", internalKey)
    .update(`zapi-inbound:mirage:${instanceId}`)
    .digest("hex");
  return `${origin}/api/zapi/callback?tenant=mirage&proof=${proof}`;
}

function redactWebhookUrl(webhookUrl: string): string {
  try {
    const url = new URL(webhookUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "[invalid-url]";
  }
}

function redactProviderBody(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactProviderBody);
  if (!value || typeof value !== "object") return value;
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (/token|api[_-]?key|secret|password|authorization|cookie/i.test(key)) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = redactProviderBody(nested);
    }
  }
  return result;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function requireInternalKey(req: Request, res: Response, next: () => void) {
  const key = process.env["MARKETING_INTERNAL_API_KEY"];
  if (!key) { res.status(503).json({ error: "Internal API key not configured" }); return; }
  const provided = req.headers["x-internal-key"];
  if (!provided || provided !== key) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

// ── Slug → tenantId ───────────────────────────────────────────────────────────
const slugCache = new Map<string, { id: string; ts: number }>();
async function resolveSlug(slug: string): Promise<string | null> {
  const cached = slugCache.get(slug);
  if (cached && Date.now() - cached.ts < 300_000) return cached.id;
  const { data } = await supabaseAdmin.from("tenants").select("id").eq("slug", slug).single();
  if (!data?.id) return null;
  slugCache.set(slug, { id: data.id, ts: Date.now() });
  return data.id;
}

// ── Z-API: configura webhook inbound de uma instância ────────────────────────
async function setZapiInboundWebhook(
  instanceId: string,
  token: string,
  clientToken: string | null,
  webhookUrl: string
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/update-webhook-received`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;

  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({ value: webhookUrl }),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

async function getTenantZapiInstances(
  companySlug: string | undefined,
  tenantId: string | undefined,
): Promise<{ resolvedTenantId: string | null; instances: ZapiInstance[] }> {
  const normalizedSlug = companySlug?.trim().toLowerCase();
  const normalizedTenantId = tenantId?.trim() || undefined;

  // Nunca aceite um slug e um UUID que apontem para operações diferentes.
  // Sem esta checagem, uma chamada poderia pedir as credenciais Mirage e
  // registrar eventos contra o tenant de outra empresa.
  if (normalizedSlug && normalizedTenantId) {
    const slugTenantId = await resolveSlug(normalizedSlug);
    if (!slugTenantId) throw new Error(`Tenant não encontrado: ${normalizedSlug}`);
    if (slugTenantId !== normalizedTenantId) {
      throw new Error("company_slug e tenant_id pertencem a tenants diferentes");
    }
  }

  const mirageTenantId = (normalizedSlug === MIRAGE_TENANT || normalizedTenantId)
    ? await resolveSlug(MIRAGE_TENANT)
    : null;
  const isMirageRequest =
    normalizedSlug === MIRAGE_TENANT ||
    Boolean(normalizedTenantId && mirageTenantId === normalizedTenantId);

  if (isMirageRequest) {
    const mirageInstance = getMirageEnvInstance();
    if (!mirageInstance) {
      throw new Error("Credenciais Z-API da Mirage não configuradas na produção");
    }
    if (!mirageTenantId) {
      throw new Error("Tenant Mirage não encontrado");
    }
    return { resolvedTenantId: mirageTenantId, instances: [mirageInstance] };
  }

  let resolvedTenantId: string | null = normalizedTenantId ?? null;
  if (!resolvedTenantId && normalizedSlug) {
    resolvedTenantId = await resolveSlug(normalizedSlug);
    if (!resolvedTenantId) throw new Error(`Tenant não encontrado: ${normalizedSlug}`);
  }
  if (!resolvedTenantId) throw new Error("Informe company_slug ou tenant_id");

  const rows = await db
    .select({ whatsappInstances: salesAutomationConfig.whatsappInstances })
    .from(salesAutomationConfig)
    .where(eq(salesAutomationConfig.tenantId, resolvedTenantId))
    .limit(1);

  if (rows.length === 0 || !rows[0].whatsappInstances) {
    throw new Error("Nenhuma configuração de WhatsApp encontrada para esse tenant");
  }

  return {
    resolvedTenantId,
    instances: rows[0].whatsappInstances as ZapiInstance[],
  };
}

// ── POST /api/internal/zapi/configure-webhook ─────────────────────────────────
//
// Lê as instâncias Z-API do tenant, e configura o webhook inbound em todas elas
// (ou apenas nas que tiverem o uso especificado).
//
// Body: { company_slug, webhook_url, uso? }
//   company_slug  — slug do tenant (ex: "r2pb")
//   webhook_url   — URL do webhook n8n (ex: "https://…/webhook/mirage-zapi-postfunnel-router")
//   uso           — filtra instâncias por uso (opcional; se omitido aplica em todas Z-API)
//
// Retorna: { results: [{ instanceId, ok, status, body }] }

router.post(
  "/internal/zapi/configure-webhook",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const { company_slug, tenant_id, webhook_url, uso } = req.body as {
      company_slug?: string;
      tenant_id?: string;
      webhook_url?: string;
      uso?: string;
    };

    const normalizedSlug = company_slug?.trim().toLowerCase();
    const mirageWebhookUrl = normalizedSlug === MIRAGE_TENANT ? mirageInboundWebhookUrl() : null;
    if (normalizedSlug === MIRAGE_TENANT && !mirageWebhookUrl) {
      res.status(503).json({ error: "Callback público seguro da Mirage não configurado" });
      return;
    }
    if (normalizedSlug === MIRAGE_TENANT && webhook_url && webhook_url !== mirageWebhookUrl) {
      res.status(400).json({ error: "A Mirage só aceita o callback público exclusivo configurado pelo Hub" });
      return;
    }
    const effectiveWebhookUrl = mirageWebhookUrl ?? webhook_url?.trim();

    if (!effectiveWebhookUrl) {
      res.status(400).json({ error: "webhook_url é obrigatório" });
      return;
    }
    if (!company_slug && !tenant_id) {
      res.status(400).json({ error: "Informe company_slug ou tenant_id" });
      return;
    }

    try {
      const { resolvedTenantId, instances } = await getTenantZapiInstances(company_slug, tenant_id);

      // Filtra instâncias Z-API (e pelo uso, se especificado)
      const targets = instances.filter(inst => {
        if (inst.canal !== "zapi") return false;
        if (!inst.instanceId || !inst.token) return false;
        if (uso && !inst.usos?.includes(uso)) return false;
        return true;
      });

      if (targets.length === 0) {
        res.status(404).json({
          error: "Nenhuma instância Z-API encontrada" + (uso ? ` com uso '${uso}'` : ""),
          total_instances: instances.length,
        });
        return;
      }

      // Configura webhook em cada instância encontrada
      const results = await Promise.all(
        targets.map(async (inst) => {
          const result = await setZapiInboundWebhook(
            inst.instanceId!,
            inst.token!,
            inst.clientToken ?? null,
            effectiveWebhookUrl
          );
          return {
            instanceId: inst.instanceId,
            usos: inst.usos ?? [],
            ok: result.ok,
            status: result.status,
            body: redactProviderBody(result.body),
          };
        })
      );

      const allOk = results.every(r => r.ok);

      logger.info(
        {
          tenantId: resolvedTenantId,
          webhook_url: redactWebhookUrl(effectiveWebhookUrl),
          results: results.map(r => ({ id: r.instanceId, ok: r.ok, status: r.status })),
        },
        "internal/zapi/configure-webhook: concluído"
      );

      res.status(allOk ? 200 : 207).json({
        success: allOk,
        webhook_url: redactWebhookUrl(effectiveWebhookUrl),
        instances_configured: results.length,
        results,
      });
    } catch (err: any) {
      logger.error({ error: err?.message }, "internal/zapi/configure-webhook: erro");
      res.status(500).json({ error: err?.message ?? "Erro interno" });
    }
  }
);

// ── GET /api/internal/zapi/webhook-status ────────────────────────────────────
//
// Consulta o webhook inbound atual de cada instância Z-API do tenant.
// Query: company_slug=r2pb

router.get(
  "/internal/zapi/webhook-status",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const { company_slug, tenant_id } = req.query as Record<string, string>;
    if (!company_slug && !tenant_id) {
      res.status(400).json({ error: "Informe company_slug ou tenant_id" });
      return;
    }

    try {
      const { resolvedTenantId, instances } = await getTenantZapiInstances(company_slug, tenant_id);

      const results = await Promise.all(
        instances
          .filter(i => i.canal === "zapi" && i.instanceId && i.token)
          .map(async (inst) => {
            const url = `https://api.z-api.io/instances/${inst.instanceId}/token/${inst.token}/webhook`;
            const headers: Record<string, string> = {};
            if (inst.clientToken) headers["Client-Token"] = inst.clientToken;
            try {
              const r = await fetch(url, { headers });
              const body = await r.json().catch(() => null);
              return {
                instanceId: inst.instanceId,
                usos: inst.usos ?? [],
                ok: r.ok,
                webhookConfig: redactProviderBody(body),
              };
            } catch (e: any) {
              return { instanceId: inst.instanceId, usos: inst.usos ?? [], ok: false, error: e?.message };
            }
          })
      );

      res.json({ tenant_id: resolvedTenantId, instances: results });
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "Erro interno" });
    }
  }
);

// ── GET /api/internal/zapi/connection-status ──────────────────────────────────
// Healthcheck seguro da instância de um tenant. Não retorna tokens nem headers.
router.get(
  "/internal/zapi/connection-status",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const { company_slug, tenant_id } = req.query as Record<string, string>;
    if (!company_slug && !tenant_id) {
      res.status(400).json({ error: "Informe company_slug ou tenant_id" });
      return;
    }

    try {
      const { resolvedTenantId, instances } = await getTenantZapiInstances(company_slug, tenant_id);
      const targets = instances.filter((inst) => inst.canal === "zapi" && inst.instanceId && inst.token);
      if (targets.length === 0) {
        res.status(404).json({ error: "Nenhuma instância Z-API encontrada" });
        return;
      }

      const results = await Promise.all(targets.map(async (inst) => {
        const headers: Record<string, string> = {};
        if (inst.clientToken) headers["Client-Token"] = inst.clientToken;
        try {
          const response = await fetch(
            `https://api.z-api.io/instances/${inst.instanceId}/token/${inst.token}/status`,
            { headers, signal: AbortSignal.timeout(10_000) },
          );
          const body = await response.json().catch(() => null);
          return {
            instanceId: inst.instanceId,
            ok: response.ok,
            status: response.status,
            provider: redactProviderBody(body),
          };
        } catch (error) {
          return {
            instanceId: inst.instanceId,
            ok: false,
            status: 0,
            error: error instanceof Error ? error.message : "Falha de conexão",
          };
        }
      }));

      res.status(results.every((result) => result.ok) ? 200 : 207).json({
        ok: results.every((result) => result.ok),
        tenant_id: resolvedTenantId,
        instances: results,
      });
    } catch (err: any) {
      const message = err?.message ?? "Erro interno";
      const status = /credenciais.*mirage|configuração.*tenant|tenant não encontrado/i.test(message) ? 404 : 500;
      res.status(status).json({ error: message });
    }
  },
);

// ── POST /api/internal/zapi/send-message ──────────────────────────────────────
//
// Envia uma mensagem WhatsApp via Z-API usando credenciais salvas no banco.
// n8n chama este endpoint — nunca armazena credenciais Z-API diretamente.
//
// Body: { company_slug, phone, message, uso? }
//   company_slug  — slug do tenant (ex: "r2pb")
//   phone         — número destino com DDI, sem +, sem espaços (ex: "5511999999999")
//   message       — texto a enviar
//   uso           — filtra instância por uso (opcional; padrão: qualquer Z-API)
//   route_type    — para logging (ex: "nurture", "rescue", "human_active")
//
// Retorna: { ok, phone, route_type, instanceId, zapi_status, zapi_body }

router.post(
  "/internal/zapi/send-message",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const { company_slug, tenant_id, phone, message, uso, route_type } = req.body as {
      company_slug?: string;
      tenant_id?: string;
      phone: string;
      message: string;
      uso?: string;
      route_type?: string;
    };

    // LOG DIAGNÓSTICO — remover após identificar a causa do 400
    req.log.info({
      body_keys: Object.keys(req.body ?? {}),
      company_slug,
      tenant_id,
      phone,
      message_length: typeof message === "string" ? message.length : message,
      message_type: typeof message,
      uso,
      route_type,
    }, "send-message: body recebido do n8n");

    if (!phone) {
      req.log.warn({ phone }, "send-message: phone ausente → 400");
      res.status(400).json({ error: "phone é obrigatório" });
      return;
    }
    if (!company_slug && !tenant_id) {
      res.status(400).json({ error: "Informe company_slug ou tenant_id" });
      return;
    }

    try {
      const tenantConfig = await getTenantZapiInstances(company_slug, tenant_id);
      const resolvedTenantId = tenantConfig.resolvedTenantId;

      // Normaliza o phone para busca (remove + e espaços)
      const phoneForLookup = phone.replace(/[\s\-+()]/g, "");

      // Se o n8n não passar a mensagem, busca a resposta da IA do banco (gravada pelo classify)
      let effectiveMessage = (typeof message === "string" && message.trim()) ? message.trim() : null;
      if (!effectiveMessage) {
        const recent = await db
          .select({ suggestedResponse: leadAiEvents.suggestedResponse })
          .from(leadAiEvents)
          .where(and(
            eq(leadAiEvents.tenantId, resolvedTenantId!),
            eq(leadAiEvents.phone, phoneForLookup),
          ))
          .orderBy(desc(leadAiEvents.createdAt))
          .limit(1);
        effectiveMessage = recent[0]?.suggestedResponse ?? "Olá! Como posso te ajudar? 😊";
        req.log.info({ phone: phoneForLookup, fromDb: !!recent[0]?.suggestedResponse }, "send-message: mensagem recuperada do banco");
      }

      const instances = tenantConfig.instances;

      // Seleciona a instância Z-API (filtra por uso se especificado)
      const target = instances.find(inst => {
        if (inst.canal !== "zapi") return false;
        if (!inst.instanceId || !inst.token) return false;
        if (uso && !inst.usos?.includes(uso)) return false;
        return true;
      });

      if (!target) {
        res.status(404).json({
          error: "Nenhuma instância Z-API encontrada" + (uso ? ` com uso '${uso}'` : ""),
          total_instances: instances.length,
        });
        return;
      }

      // Normaliza o telefone: remove +, espaços, traços
      const phoneCleaned = phone.replace(/[\s\-+()]/g, "");

      // Chama Z-API send-text
      const url = `https://api.z-api.io/instances/${target.instanceId}/token/${target.token}/send-text`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (target.clientToken) headers["Client-Token"] = target.clientToken;

      const zapiRes = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone: phoneCleaned, message: effectiveMessage }),
      });

      const zapiBody = await zapiRes.json().catch(() => null);

      logger.info(
        {
          tenantId: resolvedTenantId,
          phone: phoneCleaned,
          route_type: route_type ?? "unknown",
          instanceId: target.instanceId,
          zapiStatus: zapiRes.status,
          zapiOk: zapiRes.ok,
          zapiBody,
        },
        "internal/zapi/send-message: enviado"
      );

      res.status(zapiRes.ok ? 200 : 502).json({
        success: zapiRes.ok,
        provider: "zapi",
        company_slug: company_slug ?? null,
        phone: phoneCleaned,
        message,
        route_type: route_type ?? "unknown",
        instanceId: target.instanceId,
          provider_response: redactProviderBody(zapiBody),
        ...(zapiRes.ok ? {} : { error: `Z-API retornou status ${zapiRes.status}` }),
      });
    } catch (err: any) {
      logger.error({ error: err?.message }, "internal/zapi/send-message: erro");
      res.status(500).json({ error: err?.message ?? "Erro interno" });
    }
  }
);

export default router;
