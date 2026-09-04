/**
 * MARKETING API — Content Pack (R2PB Campaign Factory)
 *
 * Endpoints Mirage (admin only):
 *   POST /marketing/content-pack        → recebe itens do n8n e persiste no banco
 *   GET  /marketing/content-pack/admin  → lista itens de qualquer empresa (superAdmin)
 *   GET  /marketing/content-pack/campaigns/admin → lista todas as campanhas (superAdmin)
 *
 * Endpoints Tenant (qualquer tenant autenticado):
 *   GET  /marketing/content-pack/my     → itens do próprio tenant, filtrado por company_slug
 *   GET  /marketing/content-pack/my/campaigns → campanhas do próprio tenant
 *   PATCH /marketing/content-pack/:id/status  → tenant aprova / rejeita / pede revisão
 */

import { Router } from "express";
import { eq, desc, and, sql, inArray, isNull, asc } from "drizzle-orm";
import { db, pool, contentPackItems, campaignAssets, campaignPublications, campaignMetrics, mentorSettings, tenantAssets, brandBlueprints, campaignBlueprints, machineCreatives, campaignScheduleSlots, growthCampaigns, growthAssets, growthProviderRuns, growthCampaignSlots, helenaCardMigrations, leadsEspelho, comunidadePreCadastros } from "@workspace/db";
import { getProviderAvailability } from "../../lib/growthProviderRouter";
import { generateSlotsForCampaign, autoAllocateCreative, unassignCreativeFromSlot, markSlotPublished } from "../../lib/scheduleService";
import { PLANOS } from "../billing/index";
import { supabaseAdmin } from "../../lib/supabase";
import { objectStorageClient } from "../../lib/objectStorage";
import { requireAuth, requireSuperAdmin, type AuthenticatedRequest } from "../../middlewares/auth";
import { triggerWebhook } from "../mentor/athosBridge";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { openai } from "@workspace/integrations-openai-ai-server";
import { applyTenantBranding, getTenantFallbackPrompt, isTenantBrandingRegistered, applyTenantBrandingOptional, buildPromptFromBrandBlueprint, applyBrandFromBlueprintData } from "../../lib/imageBranding";
import { selectTemplate, buildCreativePrompt, runVisualQA, TEMPLATES } from "../../lib/creativeTemplateEngine";
import { HUB_SCREENS, renderScreen, screen2Kanban, screen3PLM, screen5Relatorios, screen6Custos } from "../../lib/hubScreenComposite";
import { z } from "zod";
import { randomUUID } from "crypto";

const router = Router();

// ── Instagram Account: resolve conta de uma empresa específica ────────────────
// GET /marketing/instagram-account?company_slug=mirage
// Lê as chaves instagram_account_id_{slug}, instagram_username_{slug}, instagram_name_{slug}
// de mentor_settings. Não faz chamada à Graph API — apenas lê config local.

router.get("/marketing/instagram-account", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const slug = (req.query["company_slug"] as string | undefined)?.trim() ?? "";
    if (!slug) return res.status(400).json({ error: "company_slug obrigatório" });

    const keys = [
      `instagram_account_id_${slug}`,
      `instagram_username_${slug}`,
      `instagram_name_${slug}`,
    ];
    const rows = await db.select().from(mentorSettings).where(inArray(mentorSettings.key, keys));
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    const accountId = map[`instagram_account_id_${slug}`] ?? null;
    const username  = map[`instagram_username_${slug}`]  ?? null;
    const name      = map[`instagram_name_${slug}`]      ?? null;

    if (!accountId) {
      return res.status(404).json({
        error:    `Conta Instagram não configurada para "${slug}".`,
        hint:     `Peça ao ATHOS para configurar a chave instagram_account_id_${slug} em Mentor → Configurações.`,
        slug,
      });
    }

    res.json({ account_id: accountId, username, name, company_slug: slug });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Instagram Accounts (via Meta Graph API) — legado, mantido para admin ──────

router.get("/marketing/instagram-accounts", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const settingKeys = ["instagram_access_token", "instagram_page_id", "instagram_page_name", "instagram_account_id", "instagram_username", "instagram_name"];
    const rows = await db.select().from(mentorSettings).where(inArray(mentorSettings.key, settingKeys));
    const s: Record<string, string> = {};
    for (const r of rows) s[r.key] = r.value;

    if (!s["instagram_access_token"]) {
      return res.status(422).json({ error: "instagram_access_token não configurado. Adicione em Configurações do ATHOS_MENTOR." });
    }

    const token = s["instagram_access_token"];
    const savedPageId = s["instagram_page_id"];

    const saveIg = async (accountId: string, username: string, name?: string) => {
      await db.insert(mentorSettings).values({ key: "instagram_account_id", value: accountId })
        .onConflictDoUpdate({ target: mentorSettings.key, set: { value: accountId, updatedAt: new Date() } });
      await db.insert(mentorSettings).values({ key: "instagram_username", value: username })
        .onConflictDoUpdate({ target: mentorSettings.key, set: { value: username, updatedAt: new Date() } });
      if (name) await db.insert(mentorSettings).values({ key: "instagram_name", value: name })
        .onConflictDoUpdate({ target: mentorSettings.key, set: { value: name, updatedAt: new Date() } });
    };

    // ── 1. Dados já completos no banco ───────────────────────────────────────
    if (s["instagram_account_id"] && savedPageId) {
      req.log.info({ source: "db" }, "instagram-accounts: retornando do banco");
      return res.json({ accounts: [{
        page_id: savedPageId, page_name: s["instagram_page_name"] ?? "",
        instagram_account_id: s["instagram_account_id"],
        instagram_name: s["instagram_name"] ?? null, instagram_username: s["instagram_username"] ?? null,
      }]});
    }

    type IgAcc = { id: string; name?: string; username?: string };

    // Helper: tenta 3 chamadas com o page token para descobrir o IG account
    const tryWithPageToken = async (pageId: string, pageToken: string): Promise<IgAcc | null> => {
      // 2a: /{page-id}/instagram_accounts
      const r1 = await fetch(`https://graph.facebook.com/v19.0/${pageId}/instagram_accounts?fields=id,name,username&access_token=${pageToken}`);
      const d1 = await r1.json() as { data?: IgAcc[]; error?: unknown };
      if (!d1.error && d1.data?.length) return d1.data[0];

      // 2b: /{page-id}?fields=instagram_business_account
      const r2 = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account{id,name,username}&access_token=${pageToken}`);
      const d2 = await r2.json() as { instagram_business_account?: IgAcc; error?: unknown };
      if (!d2.error && d2.instagram_business_account) return d2.instagram_business_account;

      // 2c: /{page-id}?fields=connected_instagram_account
      const r3 = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=connected_instagram_account{id,name,username}&access_token=${pageToken}`);
      const d3 = await r3.json() as { connected_instagram_account?: IgAcc; error?: unknown };
      if (!d3.error && d3.connected_instagram_account) return d3.connected_instagram_account;

      return null;
    };

    // ── 2. Temos page_id — tenta resolver o IG account com o token salvo ─────
    if (savedPageId) {
      const ig = await tryWithPageToken(savedPageId, token);
      if (ig) {
        await saveIg(ig.id, ig.username ?? "", ig.name);
        req.log.info({ source: "page_token", ig_id: ig.id }, "instagram-accounts: IG account detectado");
        return res.json({ accounts: [{
          page_id: savedPageId, page_name: s["instagram_page_name"] ?? "",
          instagram_account_id: ig.id, instagram_name: ig.name ?? null, instagram_username: ig.username ?? null,
        }]});
      }
    }

    // ── 3. Tenta /me/accounts (funciona com user token) ───────────────────────
    const r4 = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,name,username}&access_token=${token}`);
    const d4 = await r4.json() as { data?: { id: string; name: string; access_token?: string; instagram_business_account?: IgAcc }[]; error?: { message: string } };

    if (!d4.error && d4.data?.length) {
      const page = d4.data.find(p => p.name?.toLowerCase().includes("r2pb") || p.name?.toLowerCase().includes("fábrica")) ?? d4.data[0];
      const pageToken = page.access_token ?? token;

      // Salva page_id/name e o page token
      await db.insert(mentorSettings).values({ key: "instagram_page_id", value: page.id })
        .onConflictDoUpdate({ target: mentorSettings.key, set: { value: page.id, updatedAt: new Date() } });
      await db.insert(mentorSettings).values({ key: "instagram_page_name", value: page.name })
        .onConflictDoUpdate({ target: mentorSettings.key, set: { value: page.name, updatedAt: new Date() } });
      await db.insert(mentorSettings).values({ key: "instagram_access_token", value: pageToken })
        .onConflictDoUpdate({ target: mentorSettings.key, set: { value: pageToken, updatedAt: new Date() } });

      let ig = page.instagram_business_account ?? await tryWithPageToken(page.id, pageToken);
      if (ig) {
        await saveIg(ig.id, ig.username ?? "", ig.name);
        return res.json({ accounts: [{
          page_id: page.id, page_name: page.name,
          instagram_account_id: ig.id, instagram_name: ig.name ?? null, instagram_username: ig.username ?? null,
        }]});
      }
    }

    req.log.warn({ savedPageId, hasToken: !!token }, "instagram-accounts: não foi possível detectar IG account ID");
    return res.status(422).json({ error: "Conta Instagram Business não encontrada. Preencha o Instagram Business Account ID manualmente no ATHOS (⚙️) → Instagram / Meta → IDs da conta." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Auth helpers ──────────────────────────────────────────────────────────────

let _cachedToken: string | null = null;
async function getWebhookToken(): Promise<string | null> {
  if (_cachedToken) return _cachedToken;
  const [row] = await db.select().from(mentorSettings)
    .where(eq(mentorSettings.key, "atos_api_token"));
  _cachedToken = row?.value ?? null;
  return _cachedToken;
}

async function marketingAuth(req: any, res: any, next: () => void) {
  const remoteAddr: string = req.socket?.remoteAddress ?? req.connection?.remoteAddress ?? "";
  const isLoopback = remoteAddr === "127.0.0.1" || remoteAddr === "::1" || remoteAddr === "::ffff:127.0.0.1";
  if (isLoopback) { next(); return; }

  const authHeader = req.headers["authorization"] as string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const stored = await getWebhookToken();
    if (stored && token === stored) { next(); return; }
  }

  if (req.session?.userId) { next(); return; }

  res.status(401).json({ error: "Não autorizado" });
}

/** Obtém o slug do tenant a partir do tenant_id no Supabase */
async function getTenantSlug(tenantId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from("tenants")
      .select("slug")
      .eq("id", tenantId)
      .single();
    return (data as any)?.slug ?? null;
  } catch {
    return null;
  }
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const ContentItemSchema = z.object({
  content_type: z.string(),
  title: z.string().optional().nullable(),
  hook: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  cta: z.string().optional().nullable(),
  funnel_stage: z.string().optional().nullable(),
  scheduled_day: z.number().int().optional().nullable(),
  script_json: z.record(z.unknown()).optional().nullable(),
});

const ContentPackPayloadSchema = z.object({
  company_slug: z.string(),
  campaign_id: z.string(),
  items: z.array(ContentItemSchema).min(1).max(60),
});

const StatusUpdateSchema = z.object({
  status: z.enum(["approved", "rejected", "revision_requested", "pending"]),
  note: z.string().optional(),
});

// ── Mirage: ingestão via n8n ──────────────────────────────────────────────────

router.post("/marketing/content-pack", marketingAuth, async (req, res) => {
  try {
    const parsed = ContentPackPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    }

    const { company_slug, campaign_id, items } = parsed.data;

    const rows = items.map((item) => ({
      companySlug: company_slug,
      campaignId: campaign_id,
      contentType: item.content_type,
      title: item.title ?? null,
      hook: item.hook ?? null,
      caption: item.caption ?? null,
      cta: item.cta ?? null,
      funnelStage: item.funnel_stage ?? null,
      scheduledDay: item.scheduled_day ?? null,
      scriptJson: item.script_json ?? null,
      imagePrompt: (item as any).image_prompt ?? null,
      status: "pending",
    }));

    const inserted = await db.insert(contentPackItems).values(rows).returning({ id: contentPackItems.id });

    res.json({ ok: true, campaign_id, inserted: inserted.length, ids: inserted.map((r) => r.id) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Mirage: visão admin (todas as empresas) ───────────────────────────────────

router.get("/marketing/content-pack/admin", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { campaign_id, company_slug } = req.query as Record<string, string>;
    let query = db.select().from(contentPackItems).$dynamic();
    const conditions = [];
    if (campaign_id) conditions.push(eq(contentPackItems.campaignId, campaign_id));
    if (company_slug) conditions.push(eq(contentPackItems.companySlug, company_slug));
    if (conditions.length) query = query.where(and(...conditions));
    const items = await query.orderBy(contentPackItems.companySlug, contentPackItems.scheduledDay);
    res.json({ ok: true, total: items.length, items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


router.get("/marketing/content-pack/campaigns/admin", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    // Agrupa por campaign para contar itens e status
    const allItems = await db.select({
      id: contentPackItems.id,
      campaignId: contentPackItems.campaignId,
      companySlug: contentPackItems.companySlug,
      status: contentPackItems.status,
      createdAt: contentPackItems.createdAt,
    }).from(contentPackItems).orderBy(desc(contentPackItems.createdAt));

    req.log.info({ total: allItems.length, slugs: [...new Set(allItems.map(i => i.companySlug))] }, "campaigns/admin allItems");

    const campaignMap: Record<string, any> = {};
    for (const item of allItems) {
      if (!campaignMap[item.campaignId]) {
        campaignMap[item.campaignId] = {
          campaignId: item.campaignId,
          companySlug: item.companySlug,
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          revision_requested: 0,
          createdAt: item.createdAt,
        };
      }
      const c = campaignMap[item.campaignId];
      c.total++;
      if (item.status) c[item.status] = (c[item.status] || 0) + 1;
    }

    const campaigns = Object.values(campaignMap)
      .filter((c: any) => c.campaignId !== "test-ping")
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ ok: true, campaigns });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Tenant: painel próprio ────────────────────────────────────────────────────

router.get("/marketing/content-pack/my", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const isSuperAdmin = req.user?.isSuperAdmin;
    const tenantId = req.userTenantIds?.[0] ?? "";

    let companySlug: string | null = null;

    if (isSuperAdmin) {
      // Super admin pode filtrar por empresa específica ou ver tudo (null = todas)
      companySlug = (req.query.company_slug as string) || null;
    } else {
      companySlug = await getTenantSlug(tenantId);
    }

    if (!isSuperAdmin && !companySlug) {
      return res.status(404).json({ error: "Empresa não mapeada para marketing" });
    }

    const { campaign_id, status } = req.query as Record<string, string>;
    const conditions: any[] = [];
    if (companySlug) conditions.push(eq(contentPackItems.companySlug, companySlug));
    if (campaign_id) conditions.push(eq(contentPackItems.campaignId, campaign_id));
    if (status) conditions.push(eq(contentPackItems.status, status));

    const items = await db.select().from(contentPackItems)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(contentPackItems.scheduledDay, contentPackItems.contentType);

    res.json({ ok: true, company_slug: companySlug, total: items.length, items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/marketing/content-pack/my/campaigns", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const isSuperAdmin = req.user?.isSuperAdmin;
    const tenantId = req.userTenantIds?.[0] ?? "";

    let companySlug: string | null = null;
    if (isSuperAdmin) {
      // Super admin: filtra por empresa se passado, senão mostra todas
      companySlug = (req.query.company_slug as string) || null;
    } else {
      companySlug = await getTenantSlug(tenantId);
    }

    req.log.info({ tenantId, isSuperAdmin, companySlug }, "marketing/my/campaigns resolved");

    if (!isSuperAdmin && !companySlug) {
      return res.status(404).json({ error: "Empresa não mapeada" });
    }

    let allItems: (typeof contentPackItems.$inferSelect)[];
    if (companySlug) {
      allItems = await db.select().from(contentPackItems)
        .where(eq(contentPackItems.companySlug, companySlug))
        .orderBy(desc(contentPackItems.createdAt));
    } else {
      allItems = await db.select().from(contentPackItems)
        .orderBy(desc(contentPackItems.createdAt));
    }

    req.log.info({ itemCount: allItems.length, companySlug }, "marketing/my/campaigns db result");

    const campaignMap: Record<string, any> = {};
    for (const item of allItems) {
      if (item.campaignId === "test-ping") continue;
      if (!campaignMap[item.campaignId]) {
        campaignMap[item.campaignId] = {
          campaignId: item.campaignId,
          companySlug: item.companySlug,
          total: 0, pending: 0, approved: 0, rejected: 0, revision_requested: 0,
          createdAt: item.createdAt,
        };
      }
      const c = campaignMap[item.campaignId];
      c.total++;
      c[item.status] = (c[item.status] || 0) + 1;
    }

    const campaigns = Object.values(campaignMap)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ ok: true, company_slug: companySlug, isSuperAdmin: !!isSuperAdmin, campaigns });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Seed: Campanha Conecta Moda — Fase Fundadora (Mirage) ─────────────────────

router.post("/marketing/seed-mirage", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Acesso restrito a administradores" });
  }

  const CAMPAIGN_ID = "conecta-moda-fase-fundadora";
  const COMPANY_SLUG = "mirage";

  const items = [
    {
      companySlug: COMPANY_SLUG,
      campaignId: CAMPAIGN_ID,
      contentType: "feed_post",
      title: "Manifesto",
      hook: "O setor do vestuário ainda se conecta no improviso.",
      caption: "O setor do vestuário ainda se conecta no improviso. Marca procurando fornecedor sem resposta. Fornecedor recebendo contato sem fit. Tempo perdido dos dois lados. O Conecta Moda nasce para organizar conexões mais compatíveis entre quem precisa produzir e quem tem capacidade de atender. Estamos abrindo a fase fundadora, com entrada gratuita para formar a base inicial.",
      cta: "Entre no radar pelo formulário.",
      funnelStage: "awareness",
      scheduledDay: 1,
      imagePrompt: "Abstract digital network visualization: glowing nodes connected by light-trail lines representing brands and suppliers finding each other on a platform. Dark navy background, electric blue and teal accent colors. Clean tech aesthetic, data-driven, no people, no clothing, no fabric. Square 1:1 Instagram format. Style: premium SaaS marketing visual, cinematic lighting.",
      status: "pending",
    },
    {
      companySlug: COMPANY_SLUG,
      campaignId: CAMPAIGN_ID,
      contentType: "feed_post",
      title: "Fornecedores",
      hook: "Se a sua empresa atende marcas, confecções ou private labels, este convite é para você.",
      caption: "Se a sua empresa atende marcas, confecções ou private labels, este convite é para você. O mercado não precisa de mais contatos soltos. Precisa de conexões mais alinhadas com capacidade, categoria e estrutura real. Entre na fase fundadora do Conecta Moda e participe da base inicial de fornecedores do radar.",
      cta: "Quero receber oportunidades mais compatíveis.",
      funnelStage: "awareness",
      scheduledDay: 2,
      imagePrompt: "Professional in a sleek modern office looking at a large monitor displaying a B2B supplier dashboard with charts, match scores and capacity metrics. Clean desk, soft background bokeh, no clothing racks, no fabric. Corporate tech atmosphere, blue UI glow on face. Square 1:1 Instagram format. Style: premium SaaS product marketing photo.",
      status: "pending",
    },
    {
      companySlug: COMPANY_SLUG,
      campaignId: CAMPAIGN_ID,
      contentType: "feed_post",
      title: "Marcas e Confecções",
      hook: "Encontrar parceiro produtivo no escuro custa tempo, margem e energia.",
      caption: "Encontrar parceiro produtivo no escuro custa tempo, margem e energia. O Conecta Moda está nascendo para aproximar marcas, confecções e fornecedores com mais critério desde o início. Se você quer encontrar parceiros mais compatíveis para produzir, entre agora na base inicial.",
      cta: "Quero encontrar parceiros.",
      funnelStage: "consideration",
      scheduledDay: 3,
      imagePrompt: "Two professionals in a clean modern boardroom reviewing a matching platform on a laptop screen together. Screen shows partner compatibility data, network graph and smart recommendations. No clothing, no fabric samples. Collaborative tech decision-making atmosphere. Square 1:1 Instagram format. Style: premium B2B SaaS campaign photography.",
      status: "pending",
    },
    {
      companySlug: COMPANY_SLUG,
      campaignId: CAMPAIGN_ID,
      contentType: "feed_post",
      title: "Fase Fundadora Gratuita",
      hook: "Estamos formando a base inicial do Conecta Moda.",
      caption: "Estamos formando a base inicial do Conecta Moda. Nesta etapa, a entrada é gratuita para acelerar as primeiras conexões entre fornecedores, facções, confecções, marcas e private labels. Quem entra agora participa da fase fundadora e ganha prioridade nas primeiras rodadas de match.",
      cta: "Entre no radar agora.",
      funnelStage: "consideration",
      scheduledDay: 4,
      imagePrompt: "Exclusive digital access concept: a glowing open door or gateway leading into an illuminated network of connected business nodes, representing early platform membership. Deep navy blue background, golden and electric blue light. Clean, abstract, no people, no clothing. Premium SaaS launch campaign aesthetic. Square 1:1 Instagram format.",
      status: "pending",
    },
    {
      companySlug: COMPANY_SLUG,
      campaignId: CAMPAIGN_ID,
      contentType: "feed_post",
      title: "Urgência — Entre Cedo",
      hook: "O melhor momento para entrar em uma rede é no começo certo.",
      caption: "O melhor momento para entrar em uma rede é no começo certo. O Conecta Moda está abrindo sua fase fundadora para empresas da cadeia do vestuário que querem estar nas primeiras conexões qualificadas da base. Se você quer entrar cedo e participar da formação do radar inicial, este é o momento.",
      cta: "Preencha o formulário.",
      funnelStage: "conversion",
      scheduledDay: 5,
      imagePrompt: "Urgency and growth concept: a rising network graph or connected web expanding rapidly, with a subtle countdown or first-mover visual element. Dark background with bright blue and amber accent light. Abstract, data-driven, no people, no clothing, no fabric. Early adopter advantage aesthetic. Square 1:1 Instagram format. Style: premium SaaS growth marketing.",
      status: "pending",
    },
  ] as (typeof contentPackItems.$inferInsert)[];

  // Remove itens e assets existentes (limpa imagens antigas contaminadas de outros tenants)
  await db.delete(campaignAssets).where(
    and(
      eq(campaignAssets.companySlug, COMPANY_SLUG),
      eq(campaignAssets.campaignId, CAMPAIGN_ID),
    )
  );
  await db.delete(contentPackItems).where(
    and(
      eq(contentPackItems.companySlug, COMPANY_SLUG),
      eq(contentPackItems.campaignId, CAMPAIGN_ID),
    )
  );

  await db.insert(contentPackItems).values(items);

  req.log.info({ count: items.length }, "marketing/seed-mirage: campanha recriada com sucesso");
  res.json({ ok: true, count: items.length, campaignId: CAMPAIGN_ID });
});

// ── Asset helpers ─────────────────────────────────────────────────────────────

async function uploadImageFromUrl(imageUrl: string, assetPath: string): Promise<string> {
  const privateDir = process.env["PRIVATE_OBJECT_DIR"] ?? "";
  if (!privateDir) throw new Error("PRIVATE_OBJECT_DIR não configurado");

  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Falha ao baixar imagem: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "image/png";

  const clean = privateDir.startsWith("/") ? privateDir.slice(1) : privateDir;
  const slashIdx = clean.indexOf("/");
  const bucketName = slashIdx >= 0 ? clean.slice(0, slashIdx) : clean;
  const dirInBucket = slashIdx >= 0 ? clean.slice(slashIdx + 1) : "";
  const objectName = dirInBucket ? `${dirInBucket}/${assetPath}` : assetPath;

  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);
  await file.save(buffer, { contentType, resumable: false });

  return `/objects/${assetPath}`;
}

// ── Assets: gerar imagens automáticas com UI do Hub (SVG composite) ──────────

router.post("/marketing/assets/generate-hub-screens", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const schema = z.object({
      company_slug: z.string().optional().default("mirage"),
      campaign_id:  z.string().optional(),
    });
    const { company_slug: companySlug, campaign_id: campaignOverride } = schema.parse(req.body);

    if (!isTenantBrandingRegistered(companySlug)) {
      return res.status(422).json({ error: `Tenant "${companySlug}" sem branding configurado.` });
    }

    // Resolve campaign_id: use override or last campaign of tenant
    let campaignId = campaignOverride;
    if (!campaignId) {
      const rows = await db.select({ campaignId: contentPackItems.campaignId })
        .from(contentPackItems)
        .where(eq(contentPackItems.companySlug, companySlug))
        .limit(1);
      campaignId = rows[0]?.campaignId;
    }
    if (!campaignId) {
      return res.status(422).json({ error: "Nenhuma campanha encontrada. Execute seed-mirage primeiro." });
    }

    // Fetch the campaign's content items ordered by day so we can link 1:1
    const items = await db.select()
      .from(contentPackItems)
      .where(and(eq(contentPackItems.companySlug, companySlug), eq(contentPackItems.campaignId, campaignId)))
      .orderBy(contentPackItems.scheduledDay);

    const privateDir = process.env["PRIVATE_OBJECT_DIR"] ?? "";
    const clean = privateDir.startsWith("/") ? privateDir.slice(1) : privateDir;
    const slashIdx = clean.indexOf("/");
    const bucketName = slashIdx >= 0 ? clean.slice(0, slashIdx) : clean;
    const dirInBucket = slashIdx >= 0 ? clean.slice(slashIdx + 1) : "";

    const inserted: { id: string; storagePath: string; screen: string; contentItemId: string | null }[] = [];

    for (let i = 0; i < HUB_SCREENS.length; i++) {
      const screen = HUB_SCREENS[i]!;
      // Link to matching content item by index (null if campaign has fewer items)
      const linkedItem = items[i] ?? null;

      // Remove any existing asset for this content item to avoid duplicates
      if (linkedItem) {
        await db.delete(campaignAssets)
          .where(and(
            eq(campaignAssets.companySlug, companySlug),
            eq(campaignAssets.contentItemId, linkedItem.id),
          ));
      }

      const svgContent = screen.svg();
      const rawBuffer  = await renderScreen(svgContent);
      const branded    = await applyTenantBranding(rawBuffer, companySlug, 1024, "auto");

      const uuid       = randomUUID();
      const assetPath  = `campaign-assets/${companySlug}/${campaignId}/${uuid}.png`;
      const objectName = dirInBucket ? `${dirInBucket}/${assetPath}` : assetPath;

      const bucket = objectStorageClient.bucket(bucketName);
      await bucket.file(objectName).save(branded, { contentType: "image/png", resumable: false });

      const storagePath = `/objects/${assetPath}`;

      const [row] = await db.insert(campaignAssets).values({
        companySlug,
        campaignId,
        contentItemId: linkedItem?.id ?? null,
        assetType:     "image",
        storagePath,
        promptUsed:    `hub-composite: ${screen.name}`,
        status:        "ready",
      }).returning();

      inserted.push({ id: row!.id, storagePath, screen: screen.name, contentItemId: linkedItem?.id ?? null });
      req.log.info({ screen: screen.name, storagePath, contentItemId: linkedItem?.id }, "marketing/generate-hub-screens: asset criado");
    }

    res.json({ ok: true, count: inserted.length, assets: inserted });
  } catch (err: any) {
    req.log.error({ err: err.message }, "marketing/generate-hub-screens: erro");
    res.status(500).json({ error: err.message });
  }
});

// ── Assets: gerar imagens dos mockups CRM/ERP (screenshots salvos no disco) ───

const MOCKUP_SCREENS = [
  { name: "CRM — Pipeline Comercial", file: "crm-pipeline.jpg",    label: "crm-pipeline"    },
  { name: "CRM — Chat / Atendimento", file: "crm-chat.jpg",        label: "crm-chat"        },
  { name: "CRM — Relatórios",         file: "crm-relatorios.jpg",  label: "crm-relatorios"  },
  { name: "ERP — Dashboard Financeiro", file: "erp-dashboard.jpg", label: "erp-dashboard"   },
  { name: "ERP — Entrada de Mercadoria", file: "erp-estoque.jpg",  label: "erp-estoque"     },
  { name: "ERP — Loja de Integrações",   file: "erp-integracoes.jpg", label: "erp-integracoes" },
];

router.post("/marketing/assets/generate-mockup-screens", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const schema = z.object({
      company_slug: z.string().optional().default("mirage"),
      campaign_id:  z.string().optional(),
    });
    const { company_slug: companySlug, campaign_id: campaignOverride } = schema.parse(req.body);

    let campaignId = campaignOverride;
    if (!campaignId) {
      const rows = await db.select({ campaignId: contentPackItems.campaignId })
        .from(contentPackItems)
        .where(eq(contentPackItems.companySlug, companySlug))
        .limit(1);
      campaignId = rows[0]?.campaignId;
    }
    if (!campaignId) {
      return res.status(422).json({ error: "Nenhuma campanha encontrada." });
    }

    const privateDir = process.env["PRIVATE_OBJECT_DIR"] ?? "";
    const clean = privateDir.startsWith("/") ? privateDir.slice(1) : privateDir;
    const slashIdx = clean.indexOf("/");
    const bucketName = slashIdx >= 0 ? clean.slice(0, slashIdx) : clean;
    const dirInBucket = slashIdx >= 0 ? clean.slice(slashIdx + 1) : "";

    if (!bucketName) {
      return res.status(500).json({ error: "PRIVATE_OBJECT_DIR não configurado." });
    }

    const screenshotsDir = "/home/runner/workspace/screenshots";

    const { readFile } = await import("fs/promises");
    const { randomUUID } = await import("crypto");
    const { existsSync } = await import("fs");

    const inserted: { id: string; storagePath: string; name: string }[] = [];

    for (const screen of MOCKUP_SCREENS) {
      const filePath = `${screenshotsDir}/${screen.file}`;
      if (!existsSync(filePath)) {
        req.log.warn({ filePath }, "marketing/generate-mockup-screens: arquivo não encontrado, pulando");
        continue;
      }

      const imageBuffer = await readFile(filePath);
      const uuid        = randomUUID();
      const assetPath   = `campaign-assets/${companySlug}/${campaignId}/${uuid}.jpg`;
      const objectName  = dirInBucket ? `${dirInBucket}/${assetPath}` : assetPath;

      const bucket = objectStorageClient.bucket(bucketName);
      await bucket.file(objectName).save(imageBuffer, { contentType: "image/jpeg", resumable: false });

      const storagePath = `/objects/${assetPath}`;

      const [row] = await db.insert(campaignAssets).values({
        companySlug,
        campaignId,
        contentItemId: null,
        assetType:     "feed_image",
        storagePath,
        promptUsed:    `mockup-screenshot: ${screen.name}`,
        status:        "ready",
      }).returning();

      inserted.push({ id: row!.id, storagePath, name: screen.name });
      req.log.info({ name: screen.name, storagePath }, "marketing/generate-mockup-screens: asset criado");
    }

    res.json({ ok: true, count: inserted.length, assets: inserted });
  } catch (err: any) {
    req.log.error({ err: err.message }, "marketing/generate-mockup-screens: erro");
    res.status(500).json({ error: err.message });
  }
});

// ── Assets: upload manual com branding (screenshot do Hub) ───────────────────

router.post("/marketing/assets/upload", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const schema = z.object({
      content_item_id: z.string().uuid().optional().nullable(),
      company_slug:    z.string().optional(),
      campaign_id:     z.string().optional(),
      image_base64:    z.string().min(100),
      branding_variant: z.enum(["auto", "color", "white", "black"]).optional().default("auto"),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });

    const { content_item_id, company_slug: slugOverride, campaign_id: campaignOverride, image_base64, branding_variant } = parsed.data;

    // Resolve item se informado
    let item: typeof contentPackItems.$inferSelect | null = null;
    if (content_item_id) {
      const rows = await db.select().from(contentPackItems).where(eq(contentPackItems.id, content_item_id)).limit(1);
      item = rows[0] ?? null;
    }

    const companySlug  = slugOverride   ?? item?.companySlug  ?? "mirage";
    const campaignId   = campaignOverride ?? item?.campaignId ?? "manual";

    if (!isTenantBrandingRegistered(companySlug)) {
      return res.status(422).json({ error: `Tenant "${companySlug}" sem branding configurado.` });
    }

    // Decodifica base64 (aceita data URI ou raw base64)
    const base64Data = image_base64.includes(",") ? image_base64.split(",")[1]! : image_base64;
    const rawBuffer  = Buffer.from(base64Data, "base64");

    // Aplica branding do tenant
    const imageBuffer = await applyTenantBranding(rawBuffer, companySlug, 1024, branding_variant);

    // Salva no object storage
    const uuid = randomUUID();
    const assetPath = `campaign-assets/${companySlug}/${campaignId}/${uuid}.png`;
    const privateDir = process.env["PRIVATE_OBJECT_DIR"] ?? "";
    const clean = privateDir.startsWith("/") ? privateDir.slice(1) : privateDir;
    const slashIdx = clean.indexOf("/");
    const bucketName = slashIdx >= 0 ? clean.slice(0, slashIdx) : clean;
    const dirInBucket = slashIdx >= 0 ? clean.slice(slashIdx + 1) : "";
    const objectName = dirInBucket ? `${dirInBucket}/${assetPath}` : assetPath;

    const bucket = objectStorageClient.bucket(bucketName);
    await bucket.file(objectName).save(imageBuffer, { contentType: "image/png", resumable: false });

    const storagePath = `/objects/${assetPath}`;

    const [inserted] = await db.insert(campaignAssets).values({
      companySlug,
      campaignId,
      contentItemId: content_item_id ?? null,
      assetType:     "image",
      storagePath,
      promptUsed:    "upload manual — screenshot do Hub Mirage",
      status:        "ready",
    }).returning();

    req.log.info({ companySlug, campaignId, id: inserted.id }, "marketing/assets/upload: asset criado via upload");
    res.json({ ok: true, id: inserted.id, storage_path: storagePath });
  } catch (err: any) {
    req.log.error({ err: err.message }, "marketing/assets/upload: erro");
    res.status(500).json({ error: err.message });
  }
});

// ── Assets: ingestão via n8n ──────────────────────────────────────────────────

const AssetPayloadSchema = z.object({
  company_slug: z.string(),
  campaign_id: z.string(),
  content_item_id: z.string().uuid().optional().nullable(),
  asset_type: z.string().default("image"),
  image_url: z.string().url(),
  prompt_used: z.string().optional().nullable(),
});

router.post("/marketing/assets", marketingAuth, async (req, res) => {
  try {
    const parsed = AssetPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    }

    const { company_slug, campaign_id, content_item_id, asset_type, image_url, prompt_used } = parsed.data;
    const uuid = randomUUID();
    const ext = image_url.includes(".png") ? "png" : "jpg";
    const assetPath = `campaign-assets/${company_slug}/${campaign_id}/${uuid}.${ext}`;

    const storagePath = await uploadImageFromUrl(image_url, assetPath);

    const [inserted] = await db.insert(campaignAssets).values({
      companySlug: company_slug,
      campaignId: campaign_id,
      contentItemId: content_item_id ?? null,
      assetType: asset_type,
      storagePath,
      promptUsed: prompt_used ?? null,
      status: "ready",
    }).returning();

    res.json({ ok: true, id: inserted.id, storage_path: storagePath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Assets: geração via IA (DALL-E / gpt-image-1) ────────────────────────────

router.post("/marketing/assets/generate", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const schema = z.object({
      content_item_id:  z.string().uuid(),
      company_slug:     z.string().optional(),
      branding_variant: z.enum(["auto", "color", "white", "black"]).optional().default("auto"),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });

    const { content_item_id, company_slug: slugOverride, branding_variant } = parsed.data;
    const isSuperAdmin = req.user?.isSuperAdmin;

    // Busca o item de conteúdo
    const [item] = await db.select().from(contentPackItems).where(eq(contentPackItems.id, content_item_id)).limit(1);
    if (!item) return res.status(404).json({ error: "Item não encontrado" });

    // Verifica acesso: tenant ou super admin
    if (!isSuperAdmin) {
      const tenantId = req.userTenantIds?.[0] ?? "";
      const slug = await getTenantSlug(tenantId);
      if (!slug || slug !== item.companySlug) return res.status(403).json({ error: "Sem acesso" });
    }

    const companySlug = slugOverride ?? item.companySlug;

    // Valida que o tenant tem branding registrado — falha explícita, sem fallback silencioso
    if (!isTenantBrandingRegistered(companySlug)) {
      return res.status(422).json({
        error: `Tenant "${companySlug}" não possui branding configurado. Registre o brand antes de gerar imagens.`,
      });
    }

    // Instrução de formato por tenant — "fotográficos" força cenas realistas, errado para SaaS
    const noText = companySlug === "mirage"
      ? `NO text, NO typography, NO logos, NO watermarks anywhere in the image. Square 1:1 format for Instagram. DO NOT generate people in factories, clothing production, sewing machines, fabric, or textile workers.`
      : `IMPORTANTE: absolutamente nenhum texto, palavra, letra, logotipo ou símbolo na imagem — apenas elementos visuais fotográficos sem qualquer sobreposição tipográfica. Formato quadrado 1:1 para Instagram.`;

    // Monta prompt: prioriza image_prompt do item; senão constrói a partir do fallback do tenant
    let prompt: string;
    if (item.imagePrompt) {
      prompt = `${item.imagePrompt} | ${noText}`;
    } else {
      const fallbackBase = getTenantFallbackPrompt(companySlug);
      const parts: string[] = [fallbackBase];
      if (item.title)       parts.push(`Visual theme: ${item.title}`);
      if (item.hook)        parts.push(`Concept: ${item.hook}`);
      if (item.funnelStage) parts.push(`Funnel stage: ${item.funnelStage}`);
      parts.push(noText);
      prompt = parts.join(". ");
    }

    req.log.info({ companySlug, itemId: content_item_id, hasImagePrompt: !!item.imagePrompt, promptPreview: prompt.slice(0, 200) }, "marketing/generate: prompt resolved");

    // Gera a imagem base com IA
    const rawBuffer = await generateImageBuffer(prompt, "1024x1024");

    // Aplica branding do tenant — nunca herda config de outro tenant
    const imageBuffer = await applyTenantBranding(rawBuffer, companySlug, 1024, branding_variant);

    // Salva no object storage
    const uuid = randomUUID();
    const assetPath = `campaign-assets/${companySlug}/${item.campaignId}/${uuid}.png`;
    const privateDir = process.env["PRIVATE_OBJECT_DIR"] ?? "";
    const clean = privateDir.startsWith("/") ? privateDir.slice(1) : privateDir;
    const slashIdx = clean.indexOf("/");
    const bucketName = slashIdx >= 0 ? clean.slice(0, slashIdx) : clean;
    const dirInBucket = slashIdx >= 0 ? clean.slice(slashIdx + 1) : "";
    const objectName = dirInBucket ? `${dirInBucket}/${assetPath}` : assetPath;

    const bucket = objectStorageClient.bucket(bucketName);
    await bucket.file(objectName).save(imageBuffer, { contentType: "image/png", resumable: false });

    const storagePath = `/objects/${assetPath}`;

    // Persiste no banco vinculando ao content_item_id
    const [inserted] = await db.insert(campaignAssets).values({
      companySlug,
      campaignId:    item.campaignId,
      contentItemId: content_item_id,
      assetType:     "image",
      storagePath,
      promptUsed:    prompt,
      status:        "ready",
    }).returning();

    res.json({ ok: true, id: inserted.id, storage_path: storagePath, prompt_used: prompt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/marketing/assets/thumbnails", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const isSuperAdmin = req.user?.isSuperAdmin;
    const tenantId = req.userTenantIds?.[0] ?? "";

    let companySlug: string | null = null;
    if (!isSuperAdmin) {
      companySlug = await getTenantSlug(tenantId);
      if (!companySlug) return res.status(403).json({ error: "Tenant sem slug" });
    } else {
      companySlug = (req.query.company_slug as string) || null;
    }

    const conditions = companySlug ? [eq(campaignAssets.companySlug, companySlug)] : [];
    const all = await db.select({
      id: campaignAssets.id,
      campaignId: campaignAssets.campaignId,
      companySlug: campaignAssets.companySlug,
      storagePath: campaignAssets.storagePath,
      assetType: campaignAssets.assetType,
      createdAt: campaignAssets.createdAt,
    }).from(campaignAssets)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(campaignAssets.campaignId, desc(campaignAssets.createdAt));

    const seen = new Set<string>();
    const thumbs = all.filter(a => {
      if (seen.has(a.campaignId)) return false;
      seen.add(a.campaignId);
      return true;
    });

    res.set("Cache-Control", "no-store");
    req.log.info({ count: thumbs.length, slugs: thumbs.map(t => t.companySlug) }, "marketing/thumbnails result");
    res.json({ ok: true, thumbnails: thumbs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/marketing/assets/campaign/:campaignId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { campaignId } = req.params;
    const isSuperAdmin = req.user?.isSuperAdmin;
    const tenantId = req.userTenantIds?.[0] ?? "";

    let companySlug: string | null = null;
    if (!isSuperAdmin) {
      companySlug = await getTenantSlug(tenantId);
      if (!companySlug) return res.status(403).json({ error: "Tenant sem slug configurado" });
    } else {
      companySlug = (req.query.company_slug as string) || null;
    }

    const conditions = [eq(campaignAssets.campaignId, campaignId)];
    if (companySlug) conditions.push(eq(campaignAssets.companySlug, companySlug));

    const assets = await db.select().from(campaignAssets)
      .where(and(...conditions))
      .orderBy(desc(campaignAssets.createdAt));

    res.json({ ok: true, campaignId, total: assets.length, assets });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Tenant: aprovar / rejeitar item ──────────────────────────────────────────

router.patch("/marketing/content-pack/:id/status", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const parsed = StatusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    }

    const isSuperAdmin = req.user?.isSuperAdmin;
    const tenantId = req.userTenantIds?.[0] ?? "";

    // Carrega o item
    const [item] = await db.select().from(contentPackItems).where(eq(contentPackItems.id, id));
    if (!item) return res.status(404).json({ error: "Item não encontrado" });

    // Verifica se o tenant tem acesso a este item
    if (!isSuperAdmin) {
      const slug = await getTenantSlug(tenantId);
      if (slug !== item.companySlug) {
        return res.status(403).json({ error: "Acesso negado" });
      }
    }

    const [updated] = await db.update(contentPackItems)
      .set({
        status: parsed.data.status,
        statusNote: parsed.data.note ?? null,
        reviewedAt: new Date(),
      })
      .where(eq(contentPackItems.id, id))
      .returning();

    res.json({ ok: true, item: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Publications: registro e auditoria ────────────────────────────────────────

const PublicationPayloadSchema = z.object({
  company_slug: z.string(),
  campaign_id: z.string(),
  content_item_id: z.string().uuid().optional().nullable(),
  asset_id: z.string().uuid().optional().nullable(),
  channel: z.string().default("instagram"),
  caption: z.string().optional().nullable(),
  scheduled_at: z.string().datetime().optional().nullable(),
  external_account_id: z.string().optional().nullable(),
});

const PublicationStatusSchema = z.object({
  status: z.enum(["scheduled", "published", "failed", "cancelled"]),
  published_at: z.string().datetime().optional().nullable(),
  external_post_id: z.string().optional().nullable(),
  error_message: z.string().optional().nullable(),
});

router.post("/marketing/publications", marketingAuth, async (req, res) => {
  try {
    const parsed = PublicationPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    }
    const d = parsed.data;
    const [inserted] = await db.insert(campaignPublications).values({
      companySlug: d.company_slug,
      campaignId: d.campaign_id,
      contentItemId: d.content_item_id ?? null,
      assetId: d.asset_id ?? null,
      channel: d.channel,
      caption: d.caption ?? null,
      scheduledAt: d.scheduled_at ? new Date(d.scheduled_at) : null,
      externalAccountId: d.external_account_id ?? null,
      status: "scheduled",
    }).returning();
    res.json({ ok: true, id: inserted.id, status: inserted.status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/marketing/publications/campaign/:campaignId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { campaignId } = req.params;
    const isSuperAdmin = req.user?.isSuperAdmin;
    const tenantId = req.userTenantIds?.[0] ?? "";

    let companySlug: string | null = null;
    if (!isSuperAdmin) {
      companySlug = await getTenantSlug(tenantId);
      if (!companySlug) return res.status(403).json({ error: "Tenant sem slug" });
    } else {
      companySlug = (req.query.company_slug as string) || null;
    }

    const conditions = [eq(campaignPublications.campaignId, campaignId)];
    if (companySlug) conditions.push(eq(campaignPublications.companySlug, companySlug));

    const pubs = await db.select().from(campaignPublications)
      .where(and(...conditions))
      .orderBy(desc(campaignPublications.scheduledAt));

    res.json({ ok: true, campaignId, total: pubs.length, publications: pubs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/marketing/publications/:id/status", marketingAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = PublicationStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    }
    const d = parsed.data;
    const [updated] = await db.update(campaignPublications)
      .set({
        status: d.status,
        publishedAt: d.published_at ? new Date(d.published_at) : null,
        externalPostId: d.external_post_id ?? null,
        errorMessage: d.error_message ?? null,
      })
      .where(eq(campaignPublications.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Publicação não encontrada" });
    res.json({ ok: true, publication: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Metrics: performance por publicação/campanha ──────────────────────────────

const MetricsPayloadSchema = z.object({
  company_slug: z.string(),
  campaign_id: z.string(),
  publication_id: z.string().uuid().optional().nullable(),
  channel: z.string().default("instagram"),
  external_post_id: z.string().optional().nullable(),
  metric_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: YYYY-MM-DD"),
  impressions: z.number().int().min(0).default(0),
  reach: z.number().int().min(0).default(0),
  likes: z.number().int().min(0).default(0),
  comments: z.number().int().min(0).default(0),
  shares: z.number().int().min(0).default(0),
  saves: z.number().int().min(0).default(0),
  profile_visits: z.number().int().min(0).default(0),
  link_clicks: z.number().int().min(0).default(0),
  direct_messages: z.number().int().min(0).default(0),
  leads_generated: z.number().int().min(0).default(0),
});

router.post("/marketing/metrics", marketingAuth, async (req, res) => {
  try {
    const parsed = MetricsPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    }
    const d = parsed.data;
    const [inserted] = await db.insert(campaignMetrics).values({
      companySlug: d.company_slug,
      campaignId: d.campaign_id,
      publicationId: d.publication_id ?? null,
      channel: d.channel,
      externalPostId: d.external_post_id ?? null,
      metricDate: d.metric_date,
      impressions: d.impressions,
      reach: d.reach,
      likes: d.likes,
      comments: d.comments,
      shares: d.shares,
      saves: d.saves,
      profileVisits: d.profile_visits,
      linkClicks: d.link_clicks,
      directMessages: d.direct_messages,
      leadsGenerated: d.leads_generated,
    }).returning();
    res.json({ ok: true, id: inserted.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/marketing/metrics/campaign/:campaignId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { campaignId } = req.params;
    const isSuperAdmin = req.user?.isSuperAdmin;
    const tenantId = req.userTenantIds?.[0] ?? "";

    let companySlug: string | null = null;
    if (!isSuperAdmin) {
      companySlug = await getTenantSlug(tenantId);
      if (!companySlug) return res.status(403).json({ error: "Tenant sem slug" });
    } else {
      companySlug = (req.query.company_slug as string) || null;
    }

    const conditions = [eq(campaignMetrics.campaignId, campaignId)];
    if (companySlug) conditions.push(eq(campaignMetrics.companySlug, companySlug));

    const rows = await db.select().from(campaignMetrics)
      .where(and(...conditions))
      .orderBy(desc(campaignMetrics.metricDate));

    // Totais agregados
    const totals = rows.reduce((acc, r) => ({
      impressions:    acc.impressions    + (r.impressions    ?? 0),
      reach:          acc.reach          + (r.reach          ?? 0),
      likes:          acc.likes          + (r.likes          ?? 0),
      comments:       acc.comments       + (r.comments       ?? 0),
      shares:         acc.shares         + (r.shares         ?? 0),
      saves:          acc.saves          + (r.saves          ?? 0),
      profileVisits:  acc.profileVisits  + (r.profileVisits  ?? 0),
      linkClicks:     acc.linkClicks     + (r.linkClicks     ?? 0),
      directMessages: acc.directMessages + (r.directMessages ?? 0),
      leadsGenerated: acc.leadsGenerated + (r.leadsGenerated ?? 0),
    }), { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, profileVisits: 0, linkClicks: 0, directMessages: 0, leadsGenerated: 0 });

    // Engagement rate: (likes + comments + shares + saves) / impressions
    const engagementRate = totals.impressions > 0
      ? ((totals.likes + totals.comments + totals.shares + totals.saves) / totals.impressions * 100)
      : 0;

    res.json({ ok: true, campaignId, total: rows.length, totals: { ...totals, engagementRate: +engagementRate.toFixed(2) }, metrics: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/marketing/metrics/publication/:publicationId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { publicationId } = req.params;
    const isSuperAdmin = req.user?.isSuperAdmin;
    const tenantId = req.userTenantIds?.[0] ?? "";

    let companySlug: string | null = null;
    if (!isSuperAdmin) {
      companySlug = await getTenantSlug(tenantId);
      if (!companySlug) return res.status(403).json({ error: "Tenant sem slug" });
    }

    const conditions = [eq(campaignMetrics.publicationId, publicationId)];
    if (companySlug) conditions.push(eq(campaignMetrics.companySlug, companySlug));

    const rows = await db.select().from(campaignMetrics)
      .where(and(...conditions))
      .orderBy(desc(campaignMetrics.metricDate));

    res.json({ ok: true, publicationId, total: rows.length, metrics: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: inserção direta de asset (sem re-download, usa storage_path já existente) ──
router.post("/marketing/assets/direct", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const schema = z.object({
      company_slug:    z.string(),
      campaign_id:     z.string(),
      asset_type:      z.string().default("image"),
      storage_path:    z.string(), // já no formato /objects/...
      content_item_id: z.string().uuid().optional().nullable(),
      prompt_used:     z.string().optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });

    const { company_slug, campaign_id, asset_type, storage_path, content_item_id, prompt_used } = parsed.data;
    const id = randomUUID();

    const [inserted] = await db.insert(campaignAssets).values({
      id,
      companySlug: company_slug,
      campaignId:  campaign_id,
      contentItemId: content_item_id ?? null,
      assetType:   asset_type,
      storagePath: storage_path,
      promptUsed:  prompt_used ?? null,
      status:      "ready",
    }).returning();

    req.log.info({ id: inserted.id, company_slug, campaign_id }, "campaign_asset direct insert");
    res.json({ ok: true, id: inserted.id });
  } catch (err: any) {
    if (err?.code === "23505") return res.json({ ok: true, skipped: true, reason: "already exists" });
    res.status(500).json({ error: err.message });
  }
});

// ── Publish Trigger: dispara publicação no Instagram via n8n ─────────────────
//
// POST /api/marketing/publish
//   Body: { companySlug, instagramAccountId, caption, imageUrl,
//           publishMode, scheduledAt?, assetId?, campaignId?, contentItemId? }
//
// 1. Valida payload
// 2. Registra publication no banco (status = "scheduled")
// 3. Dispara webhook n8n (path lido de mentor_settings key "n8n_instagram_publish_webhook")
// 4. Se o n8n falhar, atualiza o registro para "failed" e retorna o erro

const PublishTriggerSchema = z.object({
  companySlug:         z.string().min(1),
  instagramAccountId:  z.string().optional().nullable(), // resolvido no backend; frontend envia apenas como hint
  caption:             z.string().min(1),
  imageUrl:            z.string().url(),
  publishMode:         z.enum(["immediate", "scheduled"]),
  scheduledAt:         z.string().datetime().optional().nullable(),
  assetId:             z.string().uuid().optional().nullable(),
  campaignId:          z.string().optional().nullable(),
  contentItemId:       z.string().uuid().optional().nullable(),
});

router.post("/marketing/publish", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = PublishTriggerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    }

    const d = parsed.data;
    const isSuperAdmin = req.user?.isSuperAdmin;

    // Garante que o tenant só pode publicar para o próprio slug
    if (!isSuperAdmin) {
      const tenantId = req.userTenantIds?.[0] ?? "";
      const slug = await getTenantSlug(tenantId);
      if (slug !== d.companySlug) {
        return res.status(403).json({ error: "Acesso negado ao companySlug informado" });
      }
    }

    // Resolve o Instagram Account ID do backend — ignora o que veio do frontend
    const igAccountRow = await db.select().from(mentorSettings)
      .where(eq(mentorSettings.key, `instagram_account_id_${d.companySlug}`)).limit(1)
      .then(r => r[0]);
    const resolvedAccountId = igAccountRow?.value ?? d.instagramAccountId ?? null;
    if (!resolvedAccountId) {
      return res.status(422).json({
        error: `Conta Instagram não configurada para "${d.companySlug}". Configure instagram_account_id_${d.companySlug} em Mentor → Configurações.`,
      });
    }

    // Registra a publicação no banco
    const [pub] = await db.insert(campaignPublications).values({
      companySlug:       d.companySlug,
      campaignId:        d.campaignId ?? "manual",
      contentItemId:     d.contentItemId ?? null,
      assetId:           d.assetId ?? null,
      channel:           "instagram",
      caption:           d.caption,
      scheduledAt:       d.scheduledAt ? new Date(d.scheduledAt) : null,
      externalAccountId: resolvedAccountId,
      status:            "scheduled",
    }).returning();

    // Busca configurações n8n e access_token exclusivamente do tenant.
    // Sem chave global e sem webhook genérico: falhar é mais seguro que publicar
    // no workflow ou conta de outra empresa.
    const [webhookSetting, tenantTokenSetting] = await Promise.all([
      db.select().from(mentorSettings)
        .where(eq(mentorSettings.key, `n8n_instagram_publish_webhook_${d.companySlug}`)).limit(1)
        .then(r => r[0]),
      db.select().from(mentorSettings)
        .where(eq(mentorSettings.key, `instagram_access_token_${d.companySlug}`)).limit(1)
        .then(r => r[0]),
    ]);

    const webhookPath = webhookSetting?.value?.trim();
    const accessToken = tenantTokenSetting?.value ?? null;
    const tokenSource = tenantTokenSetting ? "tenant" : "none";

    if (!accessToken) {
      req.log.warn(
        { company_slug: d.companySlug, key: `instagram_access_token_${d.companySlug}` },
        `marketing/publish: access_token NÃO configurado para "${d.companySlug}" — configure instagram_access_token_${d.companySlug} em Mentor → Configurações`,
      );
    }

    if (!webhookPath) {
      await db.update(campaignPublications)
        .set({ status: "failed", errorMessage: `Webhook n8n não configurado para o tenant ${d.companySlug}` })
        .where(eq(campaignPublications.id, pub.id));
      return res.status(422).json({
        error: `Webhook n8n não configurado para "${d.companySlug}". Configure n8n_instagram_publish_webhook_${d.companySlug}.`,
      });
    }

    // Dispara o webhook n8n — executor real da publicação
    // O n8n recebe o access_token para chamar a Graph API diretamente
    let n8nResponse: unknown = null;
    let n8nError: string | null = null;
    try {
      n8nResponse = await triggerWebhook(webhookPath, {
        publication_id:        pub.id,
        company_slug:          d.companySlug,
        instagram_account_id:  resolvedAccountId,
        caption:               d.caption,
        image_url:             d.imageUrl,
        publish_mode:          d.publishMode,
        scheduled_at:          d.scheduledAt ?? null,
        // access_token enviado pelo backend — NUNCA exposto no frontend
        access_token:          accessToken,
      }, d.companySlug as "r2pb" | "mirage" | "moda_conecta");
    } catch (err: any) {
      n8nError = err.message;
      await db.update(campaignPublications)
        .set({ status: "failed", errorMessage: `n8n trigger falhou: ${err.message}` })
        .where(eq(campaignPublications.id, pub.id));
    }

    req.log.info(
      {
        publication_id:       pub.id,
        company_slug:         d.companySlug,
        publish_mode:         d.publishMode,
        token_source:         tokenSource,
        has_token:            !!accessToken,
        instagram_account_id: d.instagramAccountId,
        image_url:            d.imageUrl,
        n8n_error:            n8nError,
      },
      "marketing/publish triggered",
    );

    res.status(n8nError ? 202 : 200).json({
      ok:             !n8nError,
      publication_id: pub.id,
      status:         n8nError ? "failed" : "scheduled",
      token_source:   tokenSource,
      n8n_response:   n8nResponse,
      error:          n8nError ?? undefined,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Assets: excluir asset por id ─────────────────────────────────────────────

router.delete("/marketing/assets/:id", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.delete(campaignAssets).where(eq(campaignAssets.id, id)).returning();
    if (!deleted.length) return res.status(404).json({ error: "Asset não encontrado." });
    req.log.info({ id }, "marketing/assets: asset excluído");
    res.json({ ok: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Assets: usar tela real do ecossistema (Hub SVG ou mockup screenshot) ──────

type ScreenEntry =
  | { type: "mockup"; file: string }
  | { type: "svg"; fn: () => string };

const REAL_SCREEN_MAP: Record<string, ScreenEntry> = {
  // Hub Mirage — composites SVG com branding Mirage aplicado
  "hub-kanban":      { type: "svg", fn: screen2Kanban     },
  "hub-plm":         { type: "svg", fn: screen3PLM        },
  "hub-custos":      { type: "svg", fn: screen6Custos     },
  "hub-relatorios":  { type: "svg", fn: screen5Relatorios },
  // Hub Mirage — screenshots reais da interface
  "kanban-preview":  { type: "mockup", file: "kanban-board-creative.jpg" },
  "hub-central":     { type: "mockup", file: "hub-central.jpg"     },
  "hub-comecar":     { type: "mockup", file: "hub-comecar.jpg"     },
  "hub-home":        { type: "mockup", file: "hub-home.jpg"        },
  "hub-planos":      { type: "mockup", file: "hub-planos.jpg"      },
  // CRM Helena — screenshots reais
  "crm-pipeline":    { type: "mockup", file: "crm-pipeline.jpg"    },
  "crm-chat":        { type: "mockup", file: "crm-chat.jpg"        },
  "crm-relatorios":  { type: "mockup", file: "crm-relatorios.jpg"  },
  // ERP VhSys — screenshots reais
  "erp-dashboard":   { type: "mockup", file: "erp-dashboard.jpg"   },
  "erp-estoque":     { type: "mockup", file: "erp-estoque.jpg"     },
  "erp-integracoes": { type: "mockup", file: "erp-integracoes.jpg" },
  // Moda Conecta — screenshots reais
  "mc-form":          { type: "mockup", file: "moda-conecta-form.jpg"         },
  "mc-form-mobile":   { type: "mockup", file: "moda-conecta-form-mobile.jpg"  },
  "mc-beneficios":    { type: "mockup", file: "moda-conecta-beneficios.jpg"   },
};

// ── Assets: preview miniatura de tela real (serve JPG direto do disco) ─────────

router.get("/marketing/screen-preview/:key", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { key } = req.params as { key: string };
    const screenDef = REAL_SCREEN_MAP[key];
    if (!screenDef) return res.status(404).json({ error: "screen_key desconhecido" });
    if (screenDef.type !== "mockup") {
      const svg = screenDef.fn();
      res.setHeader("Content-Type", "image/svg+xml");
      return res.send(svg);
    }
    const filePath = `/home/runner/workspace/screenshots/${screenDef.file}`;
    const { existsSync } = await import("fs");
    if (!existsSync(filePath)) return res.status(404).json({ error: "arquivo não encontrado" });
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.sendFile(filePath);
  } catch (err: any) {
    req.log.error({ err: err.message }, "marketing/screen-preview: erro");
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/marketing/assets/use-real-screen", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const schema = z.object({
      campaign_id:     z.string(),
      content_item_id: z.string().uuid().optional().nullable(),
      screen_key:      z.string(),
      company_slug:    z.string().optional().default("mirage"),
    });
    const { campaign_id: campaignId, content_item_id: contentItemId, screen_key: screenKey, company_slug: companySlug } = schema.parse(req.body);

    const screenDef = REAL_SCREEN_MAP[screenKey];
    if (!screenDef) return res.status(400).json({ error: `screen_key "${screenKey}" desconhecido.` });

    const privateDir = process.env["PRIVATE_OBJECT_DIR"] ?? "";
    if (!privateDir) return res.status(500).json({ error: "PRIVATE_OBJECT_DIR não configurado." });
    const clean = privateDir.startsWith("/") ? privateDir.slice(1) : privateDir;
    const slashIdx = clean.indexOf("/");
    const bucketName = slashIdx >= 0 ? clean.slice(0, slashIdx) : clean;
    const dirInBucket = slashIdx >= 0 ? clean.slice(slashIdx + 1) : "";

    // Substituir asset existente vinculado ao content_item
    if (contentItemId) {
      await db.delete(campaignAssets).where(and(
        eq(campaignAssets.contentItemId, contentItemId),
        eq(campaignAssets.companySlug, companySlug),
      ));
    }

    const { readFile } = await import("fs/promises");
    const { randomUUID } = await import("crypto");

    let imageBuffer: Buffer;
    let ext: string;
    let promptUsed: string;

    if (screenDef.type === "mockup") {
      // Screenshot real + branding do tenant sobreposto (logo + rodapé)
      const filePath = `/home/runner/workspace/screenshots/${screenDef.file}`;
      const raw = await readFile(filePath);
      imageBuffer = await applyTenantBrandingOptional(raw, companySlug, 1024, "auto");
      ext = "png";
      promptUsed = `screenshot-branded: ${screenKey}`;
    } else {
      // Composite SVG gerado em código + branding do tenant aplicado
      const svgContent = screenDef.fn();
      const raw = await renderScreen(svgContent);
      imageBuffer = await applyTenantBranding(raw, companySlug, 1024, "auto");
      ext = "png";
      promptUsed = `hub-svg: ${screenKey}`;
    }

    const uuid      = randomUUID();
    const assetPath = `campaign-assets/${companySlug}/${campaignId}/${uuid}.${ext}`;
    const objectName = dirInBucket ? `${dirInBucket}/${assetPath}` : assetPath;

    const bucket = objectStorageClient.bucket(bucketName);
    await bucket.file(objectName).save(imageBuffer, {
      contentType: ext === "jpg" ? "image/jpeg" : "image/png",
      resumable: false,
    });

    const storagePath = `/objects/${assetPath}`;

    const [row] = await db.insert(campaignAssets).values({
      companySlug,
      campaignId,
      contentItemId:  contentItemId ?? null,
      assetType:      "feed_image",
      storagePath,
      promptUsed,
      status:         "ready",
    }).returning();

    req.log.info({ screenKey, contentItemId, storagePath }, "marketing/use-real-screen: asset criado");
    res.json({ ok: true, asset: row });
  } catch (err: any) {
    req.log.error({ err: err.message }, "marketing/use-real-screen: erro");
    res.status(500).json({ error: err.message });
  }
});

// ── Biblioteca de assets do tenant ────────────────────────────────────────────

// GET /marketing/library?company_slug=x
router.get("/marketing/library", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const isSuperAdmin = req.user?.isSuperAdmin;
    const tenantId = req.userTenantIds?.[0] ?? "";
    let companySlug: string | null = null;
    if (isSuperAdmin) {
      companySlug = (req.query.company_slug as string) || null;
    } else {
      companySlug = await getTenantSlug(tenantId);
    }
    if (!companySlug) return res.status(400).json({ error: "company_slug obrigatório" });
    const assets = await db.select().from(tenantAssets)
      .where(eq(tenantAssets.companySlug, companySlug))
      .orderBy(desc(tenantAssets.createdAt));
    res.json({ ok: true, total: assets.length, assets });
  } catch (err: any) {
    req.log.error({ err: err.message }, "marketing/library GET: erro");
    res.status(500).json({ error: err.message });
  }
});

// POST /marketing/library/upload — recebe base64 JSON
router.post("/marketing/library/upload", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const schema = z.object({
      company_slug: z.string(),
      filename: z.string(),
      data_base64: z.string(),
      mimetype: z.string().default("image/jpeg"),
    });
    const { company_slug: companySlug, filename, data_base64, mimetype } = schema.parse(req.body);

    const buffer = Buffer.from(data_base64, "base64");
    const ext = mimetype.split("/")[1] ?? "jpg";
    const uuid = randomUUID();
    const assetPath = `library-assets/${companySlug}/${uuid}.${ext}`;

    const privateDir = process.env["PRIVATE_OBJECT_DIR"] ?? "";
    if (!privateDir) return res.status(500).json({ error: "PRIVATE_OBJECT_DIR não configurado." });
    const clean = privateDir.startsWith("/") ? privateDir.slice(1) : privateDir;
    const slashIdx = clean.indexOf("/");
    const bucketName = slashIdx >= 0 ? clean.slice(0, slashIdx) : clean;
    const dirInBucket = slashIdx >= 0 ? clean.slice(slashIdx + 1) : "";
    const objectName = dirInBucket ? `${dirInBucket}/${assetPath}` : assetPath;

    const bucket = objectStorageClient.bucket(bucketName);
    await bucket.file(objectName).save(buffer, { contentType: mimetype, resumable: false });

    const storagePath = `/objects/${assetPath}`;
    const [row] = await db.insert(tenantAssets).values({
      companySlug, filename, storagePath, mimetype, sizeBytes: buffer.length,
    }).returning();

    req.log.info({ companySlug, filename, storagePath }, "marketing/library/upload: asset criado");
    res.json({ ok: true, asset: row });
  } catch (err: any) {
    req.log.error({ err: err.message }, "marketing/library/upload: erro");
    res.status(500).json({ error: err.message });
  }
});

// DELETE /marketing/library/:id
router.delete("/marketing/library/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    await db.delete(tenantAssets).where(eq(tenantAssets.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /marketing/library/:id/link — vincula asset da biblioteca a um item de campanha
router.post("/marketing/library/:id/link", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      campaign_id: z.string(),
      content_item_id: z.string(),
      company_slug: z.string(),
    });
    const { campaign_id: campaignId, content_item_id: contentItemId, company_slug: companySlug } = schema.parse(req.body);

    const [libraryAsset] = await db.select().from(tenantAssets)
      .where(eq(tenantAssets.id, id)).limit(1);
    if (!libraryAsset) return res.status(404).json({ error: "Asset não encontrado na biblioteca" });

    await db.delete(campaignAssets).where(and(
      eq(campaignAssets.contentItemId, contentItemId),
      eq(campaignAssets.companySlug, companySlug),
    ));

    const [row] = await db.insert(campaignAssets).values({
      companySlug,
      campaignId,
      contentItemId,
      assetType: "feed_image",
      storagePath: libraryAsset.storagePath,
      promptUsed: `biblioteca: ${libraryAsset.filename}`,
      status: "ready",
    }).returning();

    req.log.info({ id, contentItemId, campaignId }, "marketing/library/link: vinculado");
    res.json({ ok: true, asset: row });
  } catch (err: any) {
    req.log.error({ err: err.message }, "marketing/library/link: erro");
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MÁQUINA DE MARKETING — Brand Blueprint, Campaign Blueprint, Creatives
// ═══════════════════════════════════════════════════════════════════════════════

// Helpers
function calcBrandSuficiency(b: Record<string, unknown>): { score: number; level: "incompleto" | "suficiente" | "forte" } {
  const required = ["nome_marca","segmento","proposito","promessa","diferencial","publico_principal","tom_de_voz","produto_principal","objetivo_atual"];
  let filled = required.filter(k => {
    const v = b[k];
    return v !== null && v !== undefined && String(v).trim() !== "";
  }).length;
  const adjs = b["adjetivos"] as string[] | undefined;
  if (adjs && adjs.length >= 3) filled++;
  const total = required.length + 1;
  const pct = filled / total;
  return { score: Math.round(pct * 100), level: pct >= 0.85 ? "forte" : pct >= 0.6 ? "suficiente" : "incompleto" };
}

function calcCampaignSuficiency(c: Record<string, unknown>): { score: number; level: "incompleto" | "suficiente" | "pronto"; missing: string[] } {
  const checks: Array<{ key: string; label: string; test: () => boolean }> = [
    { key: "objetivo",         label: "Objetivo",         test: () => !!str(c["objetivo"]) },
    { key: "produto_foco",     label: "Produto/Foco",     test: () => !!str(c["produto_foco"]) },
    { key: "promessa_central", label: "Promessa central", test: () => !!str(c["promessa_central"]) },
    { key: "publico_principal",label: "Público principal",test: () => !!str(c["publico_principal"]) },
    { key: "cta_principal",    label: "CTA principal",    test: () => !!str(c["cta_principal"]) },
    { key: "angulos",          label: "3+ ângulos",       test: () => arr(c["angulos"]).filter(a => a.trim()).length >= 3 },
    { key: "pilares",          label: "3+ pilares",       test: () => arr(c["pilares"]).filter(a => a.trim()).length >= 3 },
  ];
  const results = checks.map(ch => ({ ...ch, ok: ch.test() }));
  const filled = results.filter(r => r.ok).length;
  const missing = results.filter(r => !r.ok).map(r => r.label);
  const pct = filled / checks.length;
  return { score: Math.round(pct * 100), level: pct >= 0.85 ? "pronto" : pct >= 0.57 ? "suficiente" : "incompleto", missing };
}

function str(v: unknown): string { return (v === null || v === undefined) ? "" : String(v).trim(); }
function arr(v: unknown): string[] { return Array.isArray(v) ? v : []; }

function drizzleCampaignToApi(row: typeof campaignBlueprints.$inferSelect): Record<string, unknown> {
  return {
    id:                    row.id,
    company_slug:          row.companySlug,
    nome:                  row.nome,
    objetivo:              row.objetivo,
    produto_foco:          row.produtoFoco,
    promessa_central:      row.promessaCentral,
    problema_central:      row.problemaCentral,
    desejo_central:        row.desejoCentral,
    publico_principal:     row.publicoPrincipal,
    objecoes:              row.objecoes ?? [],
    angulos:               row.angulos ?? [],
    pilares:               row.pilares ?? [],
    cta_principal:         row.ctaPrincipal,
    direcao_criativa:      row.direcaoCriativa,
    status:                row.status,
    // scheduling
    period_days:           (row as any).periodDays ?? 30,
    start_date:            (row as any).startDate ?? null,
    auto_schedule_enabled: (row as any).autoScheduleEnabled ?? true,
    auto_publish_enabled:  (row as any).autoPublishEnabled ?? false,
    default_slot_time:     (row as any).defaultSlotTime ?? "09:00",
    created_at:            row.createdAt,
    updated_at:            row.updatedAt,
  };
}

// Helper: resolve companySlug from query/body OR from tenant session
async function resolveSlug(req: AuthenticatedRequest, fromBody = false): Promise<string | null> {
  const explicit = fromBody
    ? (req.body.company_slug as string | undefined)
    : (req.query["company_slug"] as string | undefined);
  if (explicit?.trim()) return explicit.trim();
  if (req.user?.isSuperAdmin) return null;
  const tenantId = req.userTenantIds?.[0] ?? "";
  return getTenantSlug(tenantId);
}

// GET /marketing/machine/my-company — retorna o company_slug do usuário autenticado
router.get("/marketing/machine/my-company", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const slug = await resolveSlug(req);
    if (!slug) return res.status(404).json({ error: "Empresa não mapeada para este usuário" });
    res.json({ ok: true, company_slug: slug });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Brand Blueprint ────────────────────────────────────────────────────────────

// Mapper: Drizzle camelCase → snake_case para o frontend
function drizzleBrandToApi(row: typeof brandBlueprints.$inferSelect): Record<string, unknown> {
  return {
    id:                    row.id,
    company_slug:          row.companySlug,
    nome_marca:            row.nomeMarca,
    segmento:              row.segmento,
    descricao:             row.descricao,
    proposito:             row.proposito,
    promessa:              row.promessa,
    diferencial:           row.diferencial,
    publico_principal:     row.publicoPrincipal,
    dores:                 row.dores ?? [],
    desejos:               row.desejos ?? [],
    tom_de_voz:            row.tomDeVoz,
    adjetivos:             row.adjetivos ?? [],
    estilo_visual:         row.estiloVisual,
    referencias_esteticas: row.referenciasEsteticas,
    produto_principal:     row.produtoPrincipal,
    objetivo_atual:        row.objetivoAtual,
    // identidade visual
    whatsapp:              (row as any).whatsapp   ?? "",
    instagram:             (row as any).instagram  ?? "",
    cor_primaria:          (row as any).corPrimaria ?? "#2563eb",
    logo_url:              (row as any).logoUrl    ?? null,
    created_at:            row.createdAt,
    updated_at:            row.updatedAt,
  };
}

// GET /marketing/machine/brand
router.get("/marketing/machine/brand", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const companySlug = await resolveSlug(req);
    if (!companySlug) return res.status(400).json({ error: "company_slug obrigatório" });

    const [row] = await db.select().from(brandBlueprints).where(eq(brandBlueprints.companySlug, companySlug)).limit(1);
    req.log.info({ companySlug, found: !!row, nomeMarca: row?.nomeMarca ?? null }, "marketing/machine/brand GET");
    if (!row) return res.json({ ok: true, brand: null, suficiency: calcBrandSuficiency({}) });

    const brand = drizzleBrandToApi(row);
    req.log.info({ score: calcBrandSuficiency(brand).score, keys: Object.keys(brand) }, "marketing/machine/brand response");
    res.json({ ok: true, brand, suficiency: calcBrandSuficiency(brand) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PUT /marketing/machine/brand — upsert
router.put("/marketing/machine/brand", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const companySlug: string = (await resolveSlug(req, true)) ?? "";
    if (!companySlug) return res.status(400).json({ error: "company_slug obrigatório" });

    const fields = {
      nomeMarca:            req.body.nome_marca ?? null,
      segmento:             req.body.segmento ?? null,
      descricao:            req.body.descricao ?? null,
      proposito:            req.body.proposito ?? null,
      promessa:             req.body.promessa ?? null,
      diferencial:          req.body.diferencial ?? null,
      publicoPrincipal:     req.body.publico_principal ?? null,
      dores:                req.body.dores ?? [],
      desejos:              req.body.desejos ?? [],
      tomDeVoz:             req.body.tom_de_voz ?? null,
      adjetivos:            req.body.adjetivos ?? [],
      estiloVisual:         req.body.estilo_visual ?? null,
      referenciasEsteticas: req.body.referencias_esteticas ?? null,
      produtoPrincipal:     req.body.produto_principal ?? null,
      objetivoAtual:        req.body.objetivo_atual ?? null,
      // identidade visual
      ...(req.body.whatsapp    !== undefined ? { whatsapp:    req.body.whatsapp }    : {}),
      ...(req.body.instagram   !== undefined ? { instagram:   req.body.instagram }   : {}),
      ...(req.body.cor_primaria !== undefined ? { corPrimaria: req.body.cor_primaria } : {}),
      ...(req.body.logo_url    !== undefined ? { logoUrl:     req.body.logo_url }    : {}),
      updatedAt:            new Date(),
    } as any;

    const existing = await db.select({ id: brandBlueprints.id }).from(brandBlueprints).where(eq(brandBlueprints.companySlug, companySlug)).limit(1);

    let row;
    if (existing.length > 0) {
      [row] = await db.update(brandBlueprints).set(fields).where(eq(brandBlueprints.companySlug, companySlug)).returning();
    } else {
      [row] = await db.insert(brandBlueprints).values({ companySlug, ...fields }).returning();
    }

    const brand = drizzleBrandToApi(row);
    res.json({ ok: true, brand, suficiency: calcBrandSuficiency(brand) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /marketing/machine/brand/logo — upload logo (base64 JSON) e atualiza logo_url no brand blueprint
router.post("/marketing/machine/brand/logo", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const schema = z.object({
      company_slug: z.string(),
      filename:     z.string(),
      data_base64:  z.string(),
      mimetype:     z.string().default("image/png"),
    });
    const { company_slug: companySlug, filename, data_base64, mimetype } = schema.parse(req.body);

    const privateDir = process.env["PRIVATE_OBJECT_DIR"] ?? "";
    if (!privateDir) return res.status(500).json({ error: "PRIVATE_OBJECT_DIR não configurado." });

    const buffer  = Buffer.from(data_base64, "base64");
    const ext     = filename.split(".").pop() ?? "png";
    const uuid    = randomUUID();
    const assetPath   = `brand-logos/${companySlug}/${uuid}.${ext}`;
    const clean       = privateDir.startsWith("/") ? privateDir.slice(1) : privateDir;
    const slashIdx    = clean.indexOf("/");
    const bucketName  = slashIdx >= 0 ? clean.slice(0, slashIdx) : clean;
    const dirInBucket = slashIdx >= 0 ? clean.slice(slashIdx + 1) : "";
    const objectName  = dirInBucket ? `${dirInBucket}/${assetPath}` : assetPath;

    const bucket = objectStorageClient.bucket(bucketName);
    await bucket.file(objectName).save(buffer, { contentType: mimetype, resumable: false });

    const storagePath = `/objects/${assetPath}`;

    // Atualiza logo_url no brand blueprint
    const existing = await db.select({ id: brandBlueprints.id }).from(brandBlueprints).where(eq(brandBlueprints.companySlug, companySlug)).limit(1);
    if (existing.length > 0) {
      await db.update(brandBlueprints).set({ logoUrl: storagePath, updatedAt: new Date() } as any).where(eq(brandBlueprints.companySlug, companySlug));
    } else {
      await db.insert(brandBlueprints).values({ companySlug, logoUrl: storagePath } as any);
    }

    req.log.info({ companySlug, storagePath }, "marketing/machine/brand/logo: logo salvo");
    res.json({ ok: true, logo_url: storagePath });
  } catch (err: any) {
    req.log.error({ err: err.message }, "marketing/machine/brand/logo: erro");
    res.status(500).json({ error: err.message });
  }
});

// ── Campaign Blueprints ────────────────────────────────────────────────────────

// GET /marketing/machine/campaigns-bp
router.get("/marketing/machine/campaigns-bp", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const companySlug: string = (await resolveSlug(req)) ?? "";
    if (!companySlug) return res.status(400).json({ error: "company_slug obrigatório" });

    const rows = await db.select().from(campaignBlueprints).where(eq(campaignBlueprints.companySlug, companySlug)).orderBy(desc(campaignBlueprints.createdAt));
    res.json({ ok: true, campaigns: rows.map(r => { const api = drizzleCampaignToApi(r); return { ...api, suficiency: calcCampaignSuficiency(api) }; }) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /marketing/machine/campaigns-bp
router.post("/marketing/machine/campaigns-bp", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const companySlug: string = (await resolveSlug(req, true)) ?? "";
    if (!companySlug) return res.status(400).json({ error: "company_slug obrigatório" });
    if (!req.body.nome?.trim()) return res.status(400).json({ error: "nome obrigatório" });

    const periodDays         = req.body.period_days         ? parseInt(req.body.period_days, 10)  : 30;
    const autoScheduleEnabled = req.body.auto_schedule_enabled !== false;
    const autoPublishEnabled  = req.body.auto_publish_enabled === true;
    const defaultSlotTime     = req.body.default_slot_time ?? "09:00";
    const startDate           = req.body.start_date ?? new Date().toISOString().slice(0, 10);

    const [row] = await db.insert(campaignBlueprints).values({
      companySlug,
      nome: req.body.nome,
      objetivo: req.body.objetivo ?? null,
      produtoFoco: req.body.produto_foco ?? null,
      promessaCentral: req.body.promessa_central ?? null,
      problemaCentral: req.body.problema_central ?? null,
      desejoCentral: req.body.desejo_central ?? null,
      publicoPrincipal: req.body.publico_principal ?? null,
      objecoes: req.body.objecoes ?? [],
      angulos: req.body.angulos ?? [],
      pilares: req.body.pilares ?? [],
      ctaPrincipal: req.body.cta_principal ?? null,
      direcaoCriativa: req.body.direcao_criativa ?? null,
      status: "rascunho",
      ...(({ periodDays, startDate, autoScheduleEnabled, autoPublishEnabled, defaultSlotTime }) as any),
    } as any).returning();

    // Auto-generate calendar slots
    if (autoScheduleEnabled) {
      await generateSlotsForCampaign({
        campaignId: row.id,
        companySlug,
        periodDays,
        startDate: new Date(startDate),
        defaultSlotTime,
      }).catch(() => { /* non-blocking */ });
    }

    const api = drizzleCampaignToApi(row);
    res.json({ ok: true, campaign: { ...api, suficiency: calcCampaignSuficiency(api) } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /marketing/machine/campaigns-bp/:id
router.get("/marketing/machine/campaigns-bp/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [row] = await db.select().from(campaignBlueprints).where(eq(campaignBlueprints.id, req.params.id)).limit(1);
    if (!row) return res.status(404).json({ error: "Não encontrado" });
    const api = drizzleCampaignToApi(row);
    res.json({ ok: true, campaign: { ...api, suficiency: calcCampaignSuficiency(api) } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PUT /marketing/machine/campaigns-bp/:id
router.put("/marketing/machine/campaigns-bp/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const periodDays          = req.body.period_days         ? parseInt(req.body.period_days, 10) : undefined;
    const autoScheduleEnabled = req.body.auto_schedule_enabled;
    const autoPublishEnabled  = req.body.auto_publish_enabled;
    const defaultSlotTime     = req.body.default_slot_time;
    const startDate           = req.body.start_date;

    const schedFields: Record<string, unknown> = {};
    if (periodDays          !== undefined) schedFields.periodDays          = periodDays;
    if (autoScheduleEnabled !== undefined) schedFields.autoScheduleEnabled = autoScheduleEnabled;
    if (autoPublishEnabled  !== undefined) schedFields.autoPublishEnabled  = autoPublishEnabled;
    if (defaultSlotTime     !== undefined) schedFields.defaultSlotTime     = defaultSlotTime;
    if (startDate           !== undefined) schedFields.startDate           = startDate;

    const [row] = await db.update(campaignBlueprints).set({
      nome: req.body.nome,
      objetivo: req.body.objetivo ?? null,
      produtoFoco: req.body.produto_foco ?? null,
      promessaCentral: req.body.promessa_central ?? null,
      problemaCentral: req.body.problema_central ?? null,
      desejoCentral: req.body.desejo_central ?? null,
      publicoPrincipal: req.body.publico_principal ?? null,
      objecoes: req.body.objecoes ?? [],
      angulos: req.body.angulos ?? [],
      pilares: req.body.pilares ?? [],
      ctaPrincipal: req.body.cta_principal ?? null,
      direcaoCriativa: req.body.direcao_criativa ?? null,
      status: req.body.status ?? "rascunho",
      updatedAt: new Date(),
      ...schedFields,
    } as any).where(eq(campaignBlueprints.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Não encontrado" });

    // Regenerate empty slots if scheduling params changed
    const api = drizzleCampaignToApi(row);
    if ((api.auto_schedule_enabled as boolean) && (periodDays || startDate)) {
      const pd = (api.period_days as number) ?? 30;
      const sd = (api.start_date as string) ?? new Date().toISOString().slice(0, 10);
      const st = (api.default_slot_time as string) ?? "09:00";
      await generateSlotsForCampaign({
        campaignId: row.id, companySlug: row.companySlug, periodDays: pd,
        startDate: new Date(sd), defaultSlotTime: st,
      }).catch(() => {});
    }

    res.json({ ok: true, campaign: { ...api, suficiency: calcCampaignSuficiency(api) } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /marketing/machine/campaigns-bp/:id
router.delete("/marketing/machine/campaigns-bp/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    await db.delete(machineCreatives).where(eq(machineCreatives.campaignBlueprintId, req.params.id));
    await db.delete(campaignBlueprints).where(eq(campaignBlueprints.id, req.params.id));
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Machine Creatives ──────────────────────────────────────────────────────────

function drizzleCreativeToApi(r: typeof machineCreatives.$inferSelect): Record<string, unknown> {
  return {
    id:                         r.id,
    company_slug:               r.companySlug,
    campaign_blueprint_id:      r.campaignBlueprintId,
    modo_criativo:              r.modoCriativo,
    canal:                      r.canal,
    formato:                    r.formato,
    objetivo_peca:              r.objetivoPeca,
    headline:                   r.headline,
    hook:                       r.hook,
    legenda:                    r.legenda,
    cta:                        r.cta,
    direcao_arte:               r.direcaoArte,
    prompt_visual:              r.promptVisual,
    composicao_sugerida:        r.composicaoSugerida,
    cores:                      r.cores,
    elementos_obrigatorios:     r.elementosObrigatorios,
    elementos_proibidos:        r.elementosProibidos,
    proporcao:                  r.proporcao,
    quantidade_variacoes:       r.quantidadeVariacoes,
    status_aprovacao:           r.statusAprovacao,
    brand_fit_score:            r.brandFitScore,
    campaign_fit_score:         r.campaignFitScore,
    commercial_strength_score:  r.commercialStrengthScore,
    visual_quality_score:       r.visualQualityScore,
    video_prompt:               r.videoPrompt,
    asset_storage_path:         r.assetStoragePath,
    image_prompt_used:          r.imagePromptUsed,
    branding_variant:           r.brandingVariant,
    funnel_stage:               r.funnelStage,
    scheduled_at:               r.scheduledAt,
    publication_id:             r.publicationId,
    template_used:              r.templateUsed ?? null,
    created_at:                 r.createdAt,
    updated_at:                 r.updatedAt,
  };
}

// GET /marketing/machine/campaigns-bp/:id/creatives
router.get("/marketing/machine/campaigns-bp/:id/creatives", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const rows = await db.select().from(machineCreatives)
      .where(eq(machineCreatives.campaignBlueprintId, req.params.id))
      .orderBy(desc(machineCreatives.createdAt));
    res.json({ ok: true, creatives: rows.map(drizzleCreativeToApi) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /marketing/machine/campaigns-bp/:id/creatives
router.post("/marketing/machine/campaigns-bp/:id/creatives", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const companySlug: string = (await resolveSlug(req, true)) ?? "";
    const [row] = await db.insert(machineCreatives).values({
      companySlug,
      campaignBlueprintId: req.params.id,
      modoCriativo: req.body.modo_criativo ?? "conceitual",
      canal: req.body.canal ?? null,
      formato: req.body.formato ?? null,
      objetivoPeca: req.body.objetivo_peca ?? null,
      headline: req.body.headline ?? null,
      hook: req.body.hook ?? null,
      legenda: req.body.legenda ?? null,
      cta: req.body.cta ?? null,
      direcaoArte: req.body.direcao_arte ?? null,
      promptVisual: req.body.prompt_visual ?? null,
      videoPrompt: req.body.video_prompt ?? null,
      composicaoSugerida: req.body.composicao_sugerida ?? null,
      cores: req.body.cores ?? null,
      elementosObrigatorios: req.body.elementos_obrigatorios ?? null,
      elementosProibidos: req.body.elementos_proibidos ?? null,
      proporcao: req.body.proporcao ?? "1:1",
      quantidadeVariacoes: req.body.quantidade_variacoes ?? 1,
      statusAprovacao: "generated",
      brandFitScore: req.body.brand_fit_score ?? null,
      campaignFitScore: req.body.campaign_fit_score ?? null,
      commercialStrengthScore: req.body.commercial_strength_score ?? null,
      visualQualityScore: req.body.visual_quality_score ?? null,
    }).returning();
    res.json({ ok: true, creative: drizzleCreativeToApi(row) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /marketing/machine/creatives/:id
router.patch("/marketing/machine/creatives/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const map: Record<string, string> = {
      modo_criativo: "modoCriativo", canal: "canal", formato: "formato", objetivo_peca: "objetivoPeca",
      headline: "headline", hook: "hook", legenda: "legenda", cta: "cta",
      direcao_arte: "direcaoArte", prompt_visual: "promptVisual",
      composicao_sugerida: "composicaoSugerida", cores: "cores",
      elementos_obrigatorios: "elementosObrigatorios", elementos_proibidos: "elementosProibidos",
      proporcao: "proporcao", quantidade_variacoes: "quantidadeVariacoes",
      status_aprovacao: "statusAprovacao", asset_storage_path: "assetStoragePath",
      brand_fit_score: "brandFitScore", campaign_fit_score: "campaignFitScore",
      commercial_strength_score: "commercialStrengthScore", visual_quality_score: "visualQualityScore",
      video_prompt: "videoPrompt",
    };
    for (const [bodyKey, dbKey] of Object.entries(map)) {
      if (req.body[bodyKey] !== undefined) updates[dbKey] = req.body[bodyKey];
    }
    const [row] = await db.update(machineCreatives).set(updates as Parameters<typeof db.update>[0] extends infer T ? T : never).where(eq(machineCreatives.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Não encontrado" });

    // ── Auto-scheduling hook ──────────────────────────────────────────────────
    const newStatus = req.body.status_aprovacao as string | undefined;
    const isApproved = newStatus === "approved" || newStatus === "aprovado";
    if (isApproved) {
      // Check if campaign has auto_schedule_enabled
      const [campRow] = await db.select({ id: campaignBlueprints.id, autoScheduleEnabled: (campaignBlueprints as any).autoScheduleEnabled, companySlug: campaignBlueprints.companySlug })
        .from(campaignBlueprints)
        .where(eq(campaignBlueprints.id, row.campaignBlueprintId))
        .limit(1);
      if (campRow && campRow.autoScheduleEnabled !== false) {
        autoAllocateCreative({
          creativeId: row.id,
          campaignId: row.campaignBlueprintId,
          companySlug: campRow.companySlug,
          funnelStage: row.funnelStage,
        }).catch(() => {}); // non-blocking
      }
    }

    res.json({ ok: true, creative: drizzleCreativeToApi(row) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /marketing/machine/creatives/:id
router.delete("/marketing/machine/creatives/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    await db.delete(machineCreatives).where(eq(machineCreatives.id, req.params.id));
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /marketing/machine/campaigns-bp/:id/generate-creatives — gera pacote criativo com GPT-4o
router.post("/marketing/machine/campaigns-bp/:id/generate-creatives", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const campaignId = req.params.id;
    const companySlug: string = (await resolveSlug(req, true)) ?? "";
    if (!companySlug) return res.status(400).json({ error: "company_slug obrigatório" });

    const [campRow] = await db.select().from(campaignBlueprints).where(eq(campaignBlueprints.id, campaignId)).limit(1);
    if (!campRow) return res.status(404).json({ error: "Campanha não encontrada" });

    const [brandRow] = await db.select().from(brandBlueprints).where(eq(brandBlueprints.companySlug, companySlug)).limit(1);
    const brand = brandRow ? drizzleBrandToApi(brandRow) : {};

    const camp = drizzleCampaignToApi(campRow);
    const { pieces_count = 8, channel_mix = ["Instagram Feed", "Instagram Reels", "WhatsApp", "Instagram Stories"] } = req.body;

    const prompt = `Você é um especialista em marketing de conteúdo para o mercado têxtil/moda brasileiro. Gere ${pieces_count} peças criativas para a seguinte campanha.

MARCA:
- Nome: ${brand.nome_marca ?? ""}
- Segmento: ${brand.segmento ?? ""}
- Propósito: ${brand.proposito ?? ""}
- Promessa: ${brand.promessa ?? ""}
- Público principal: ${brand.publico_principal ?? ""}
- Tom de voz: ${brand.tom_de_voz ?? ""}
- Diferencial: ${brand.diferencial ?? ""}

CAMPANHA:
- Nome: ${camp.nome}
- Objetivo: ${camp.objetivo ?? ""}
- Produto/foco: ${camp.produto_foco ?? ""}
- Promessa central: ${camp.promessa_central ?? ""}
- Problema central: ${camp.problema_central ?? ""}
- Desejo central: ${camp.desejo_central ?? ""}
- CTA principal: ${camp.cta_principal ?? ""}
- Ângulos: ${(camp.angulos as string[] ?? []).join(", ")}
- Pilares de conteúdo: ${(camp.pilares as string[] ?? []).join(", ")}
- Direção criativa: ${camp.direcao_criativa ?? ""}

CANAIS DISPONÍVEIS: ${(channel_mix as string[]).join(", ")}

Retorne SOMENTE um JSON válido com o seguinte formato (sem markdown, sem explicações):
{
  "creatives": [
    {
      "canal": "Instagram Feed",
      "formato": "Post estático",
      "modo_criativo": "conceitual",
      "objetivo_peca": "string — objetivo específico desta peça",
      "headline": "string — título principal impactante",
      "hook": "string — primeira frase que para o scroll",
      "legenda": "string — texto completo do post (2-4 parágrafos, hashtags ao final)",
      "cta": "string — chamada para ação específica",
      "direcao_arte": "string — descrição visual: cores, composição, estilo fotográfico",
      "prompt_visual": "string — prompt detalhado para geração de imagem por IA",
      "video_prompt": "string ou null — roteiro/prompt para vídeo curto (Reels/Stories), null se não for vídeo"
    }
  ]
}

Distribua as peças entre os canais. Use modo_criativo: "conceitual" para awareness/branding, "comercial" para conversão/venda, "hibrido" para engajamento misto. Varie os ângulos e formatos. Para Reels e Stories, inclua um video_prompt com roteiro/direção de vídeo.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 6000,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { creatives: any[] };
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({ error: "GPT-4o retornou resposta inválida. Tente novamente." });
    }

    const items = Array.isArray(parsed.creatives) ? parsed.creatives : [];
    if (!items.length) return res.status(502).json({ error: "Nenhum criativo gerado. Tente novamente." });

    const inserted = await db.insert(machineCreatives).values(
      items.map((c: any) => ({
        companySlug,
        campaignBlueprintId: campaignId,
        modoCriativo: (["conceitual", "comercial", "hibrido"].includes(c.modo_criativo) ? c.modo_criativo : "hibrido") as "conceitual" | "comercial" | "hibrido",
        canal: c.canal ?? null,
        formato: c.formato ?? null,
        objetivoPeca: c.objetivo_peca ?? null,
        headline: c.headline ?? null,
        hook: c.hook ?? null,
        legenda: c.legenda ?? null,
        cta: c.cta ?? null,
        direcaoArte: c.direcao_arte ?? null,
        promptVisual: c.prompt_visual ?? null,
        videoPrompt: c.video_prompt ?? null,
        statusAprovacao: "generated" as const,
      }))
    ).returning();

    res.json({ ok: true, creatives: inserted.map(drizzleCreativeToApi), total: inserted.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /marketing/machine/creatives/:id/regenerate — regenera um único criativo preservando modo/canal
router.post("/marketing/machine/creatives/:id/regenerate", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const companySlug: string = (await resolveSlug(req, true)) ?? "";
    if (!companySlug) return res.status(400).json({ error: "company_slug obrigatório" });

    const [existing] = await db.select().from(machineCreatives).where(eq(machineCreatives.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Criativo não encontrado" });

    const [campRow] = await db.select().from(campaignBlueprints).where(eq(campaignBlueprints.id, existing.campaignBlueprintId)).limit(1);
    if (!campRow) return res.status(404).json({ error: "Campanha não encontrada" });

    const [brandRow] = await db.select().from(brandBlueprints).where(eq(brandBlueprints.companySlug, companySlug)).limit(1);
    const brand = brandRow ? drizzleBrandToApi(brandRow) : {};
    const camp = drizzleCampaignToApi(campRow);

    const prompt = `Você é um especialista em marketing de conteúdo para o mercado têxtil/moda brasileiro. Regenere 1 peça criativa para o canal e modo especificados.

MARCA:
- Nome: ${brand.nome_marca ?? ""}
- Segmento: ${brand.segmento ?? ""}
- Propósito: ${brand.proposito ?? ""}
- Promessa: ${brand.promessa ?? ""}
- Público: ${brand.publico_principal ?? ""}
- Tom de voz: ${brand.tom_de_voz ?? ""}

CAMPANHA:
- Nome: ${camp.nome}
- Objetivo: ${camp.objetivo ?? ""}
- Promessa central: ${camp.promessa_central ?? ""}
- CTA principal: ${camp.cta_principal ?? ""}
- Direção criativa: ${camp.direcao_criativa ?? ""}

CANAL: ${existing.canal ?? "Instagram Feed"}
FORMATO: ${existing.formato ?? "Post estático"}
MODO: ${existing.modoCriativo}

Crie uma versão NOVA e diferente — não repita o conteúdo anterior.
Retorne SOMENTE JSON válido (sem markdown):
{
  "canal": "${existing.canal ?? "Instagram Feed"}",
  "formato": "${existing.formato ?? "Post estático"}",
  "modo_criativo": "${existing.modoCriativo}",
  "objetivo_peca": "string",
  "headline": "string",
  "hook": "string",
  "legenda": "string",
  "cta": "string",
  "direcao_arte": "string",
  "prompt_visual": "string",
  "video_prompt": "string ou null"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 1500,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let c: any;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      c = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({ error: "GPT-4o retornou resposta inválida. Tente novamente." });
    }

    const [updated] = await db.update(machineCreatives).set({
      objetivoPeca: c.objetivo_peca ?? existing.objetivoPeca,
      headline: c.headline ?? existing.headline,
      hook: c.hook ?? existing.hook,
      legenda: c.legenda ?? existing.legenda,
      cta: c.cta ?? existing.cta,
      direcaoArte: c.direcao_arte ?? existing.direcaoArte,
      promptVisual: c.prompt_visual ?? existing.promptVisual,
      videoPrompt: c.video_prompt ?? null,
      statusAprovacao: "generated",
      updatedAt: new Date(),
    }).where(eq(machineCreatives.id, req.params.id)).returning();

    res.json({ ok: true, creative: drizzleCreativeToApi(updated) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /marketing/machine/campaigns-bp/:id/generate-more — adiciona mais criativos sem apagar os existentes
router.post("/marketing/machine/campaigns-bp/:id/generate-more", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const campaignId = req.params.id;
    const companySlug: string = (await resolveSlug(req, true)) ?? "";
    if (!companySlug) return res.status(400).json({ error: "company_slug obrigatório" });

    const { count = 3, modo }: { count?: number; modo?: string } = req.body;

    const [campRow] = await db.select().from(campaignBlueprints).where(eq(campaignBlueprints.id, campaignId)).limit(1);
    if (!campRow) return res.status(404).json({ error: "Campanha não encontrada" });

    const [brandRow] = await db.select().from(brandBlueprints).where(eq(brandBlueprints.companySlug, companySlug)).limit(1);
    const brand = brandRow ? drizzleBrandToApi(brandRow) : {};
    const camp = drizzleCampaignToApi(campRow);

    const modoFilter = modo && ["conceitual", "comercial", "hibrido"].includes(modo) ? `\nGere SOMENTE peças do modo_criativo: "${modo}".` : "";

    const prompt = `Você é um especialista em marketing de conteúdo para o mercado têxtil/moda brasileiro. Gere ${count} peças criativas ADICIONAIS para esta campanha.${modoFilter}

MARCA:
- Nome: ${brand.nome_marca ?? ""}
- Segmento: ${brand.segmento ?? ""}
- Propósito: ${brand.proposito ?? ""}
- Promessa: ${brand.promessa ?? ""}
- Público: ${brand.publico_principal ?? ""}
- Tom de voz: ${brand.tom_de_voz ?? ""}

CAMPANHA:
- Nome: ${camp.nome}
- Objetivo: ${camp.objetivo ?? ""}
- Promessa central: ${camp.promessa_central ?? ""}
- CTA: ${camp.cta_principal ?? ""}
- Ângulos: ${(camp.angulos as string[] ?? []).join(", ")}
- Pilares: ${(camp.pilares as string[] ?? []).join(", ")}

Retorne SOMENTE JSON válido (sem markdown):
{
  "creatives": [
    {
      "canal": "Instagram Feed|Reels|Stories|WhatsApp",
      "formato": "Post estático|Carrossel|Vídeo curto|Story animado",
      "modo_criativo": "conceitual|comercial|hibrido",
      "objetivo_peca": "string",
      "headline": "string",
      "hook": "string",
      "legenda": "string",
      "cta": "string",
      "direcao_arte": "string",
      "prompt_visual": "string",
      "video_prompt": "string ou null"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 3000,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { creatives: any[] };
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({ error: "GPT-4o retornou resposta inválida. Tente novamente." });
    }

    const items = Array.isArray(parsed.creatives) ? parsed.creatives : [];
    if (!items.length) return res.status(502).json({ error: "Nenhum criativo gerado. Tente novamente." });

    const inserted = await db.insert(machineCreatives).values(
      items.map((c: any) => ({
        companySlug,
        campaignBlueprintId: campaignId,
        modoCriativo: (["conceitual", "comercial", "hibrido"].includes(c.modo_criativo) ? c.modo_criativo : (modo ?? "hibrido")) as "conceitual" | "comercial" | "hibrido",
        canal: c.canal ?? null,
        formato: c.formato ?? null,
        objetivoPeca: c.objetivo_peca ?? null,
        headline: c.headline ?? null,
        hook: c.hook ?? null,
        legenda: c.legenda ?? null,
        cta: c.cta ?? null,
        direcaoArte: c.direcao_arte ?? null,
        promptVisual: c.prompt_visual ?? null,
        videoPrompt: c.video_prompt ?? null,
        statusAprovacao: "generated" as const,
      }))
    ).returning();

    res.json({ ok: true, creatives: inserted.map(drizzleCreativeToApi), total: inserted.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Machine: generate image for a creative ───────────────────────────────────
// POST /marketing/machine/creatives/:id/generate-image
router.post("/marketing/machine/creatives/:id/generate-image", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      company_slug:     z.string().optional(),
      branding_variant: z.enum(["auto", "color", "white", "black"]).default("auto"),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    const { branding_variant } = parsed.data;
    const isSuperAdmin = req.user?.isSuperAdmin;

    const [creative] = await db.select().from(machineCreatives).where(eq(machineCreatives.id, id)).limit(1);
    if (!creative) return res.status(404).json({ error: "Criativo não encontrado" });

    const companySlug = creative.companySlug;
    if (!isSuperAdmin) {
      const slug = await getTenantSlug(req.userTenantIds?.[0] ?? "");
      if (slug !== companySlug) return res.status(403).json({ error: "Sem acesso" });
    }

    const allowedStatuses = ["approved", "aprovado", "in_review", "in_production", "generated", "pendente"];
    if (!allowedStatuses.includes(creative.statusAprovacao)) {
      return res.status(422).json({ error: `Status "${creative.statusAprovacao}" não permite geração de imagem` });
    }

    const [brand] = await db.select().from(brandBlueprints).where(eq(brandBlueprints.companySlug, companySlug)).limit(1);

    // ── Creative Render Engine v2 ─────────────────────────────────────────────
    const templateId = selectTemplate({
      modoCriativo:  creative.modoCriativo,
      objetivoPeca:  creative.objetivoPeca,
      funnelStage:   creative.funnelStage,
      canal:         creative.canal,
    });
    const template = TEMPLATES[templateId];

    const finalPrompt = buildCreativePrompt({
      creative: {
        promptVisual:       creative.promptVisual,
        direcaoArte:        creative.direcaoArte,
        composicaoSugerida: creative.composicaoSugerida,
        cores:              creative.cores,
        headline:           creative.headline,
        canal:              creative.canal,
        formato:            creative.formato,
      },
      brand: brand ? {
        segmento:             brand.segmento,
        estiloVisual:         brand.estiloVisual,
        referenciasEsteticas: brand.referenciasEsteticas,
        adjetivos:            brand.adjetivos as string[] | null,
      } : null,
      template,
    });

    req.log.info({ id, companySlug, templateId, promptPreview: finalPrompt.slice(0, 200) }, "machine/generate-image: gerando v2");

    const rawBuffer = await generateImageBuffer(finalPrompt, "1024x1024");

    // QA gate — log issues but don't block (UX: better to get an imperfect image than none)
    const qa = await runVisualQA(rawBuffer);
    if (!qa.ok) {
      req.log.warn({ id, qa }, "machine/generate-image: QA visual detectou problemas");
    }

    // Usar branding dinâmico do DB se disponível; fallback para BRAND_REGISTRY; fallback para sem overlay
    const imageBuffer = brand
      ? await applyBrandFromBlueprintData(rawBuffer, {
          whatsapp:              (brand as any).whatsapp   ?? "",
          instagram:             (brand as any).instagram  ?? "",
          cor_primaria:          (brand as any).corPrimaria ?? "#2563eb",
          logo_url:              (brand as any).logoUrl    ?? null,
          nome_marca:            brand.nomeMarca,
          segmento:              brand.segmento,
          estilo_visual:         brand.estiloVisual,
          referencias_esteticas: brand.referenciasEsteticas,
          adjetivos:             brand.adjetivos as string[] | null,
        }, 1024, branding_variant)
      : await applyTenantBrandingOptional(rawBuffer, companySlug, 1024, branding_variant);

    const assetUuid = randomUUID();
    const assetPath = `machine-creatives/${companySlug}/${creative.campaignBlueprintId}/${assetUuid}.png`;
    const privateDir = process.env["PRIVATE_OBJECT_DIR"] ?? "";
    const clean = privateDir.startsWith("/") ? privateDir.slice(1) : privateDir;
    const slashIdx = clean.indexOf("/");
    const bucketName = slashIdx >= 0 ? clean.slice(0, slashIdx) : clean;
    const dirInBucket = slashIdx >= 0 ? clean.slice(slashIdx + 1) : "";
    const objectName = dirInBucket ? `${dirInBucket}/${assetPath}` : assetPath;

    const bucket = objectStorageClient.bucket(bucketName);
    await bucket.file(objectName).save(imageBuffer, { contentType: "image/png", resumable: false });

    const storagePath = `/objects/${assetPath}`;

    await db.update(machineCreatives)
      .set({
        assetStoragePath: storagePath,
        imagePromptUsed:  finalPrompt,
        brandingVariant:  branding_variant,
        statusAprovacao:  "in_production",
        updatedAt:        new Date(),
      } as any)
      .where(eq(machineCreatives.id, id));

    // Store templateUsed via raw SQL (column added via migration)
    try {
      await db.execute(
        sql`UPDATE machine_creatives SET template_used = ${templateId} WHERE id = ${id}`,
      );
    } catch { /* column may not exist yet if migration hasn't run */ }

    req.log.info({ id, companySlug, storagePath, templateId, qaOk: qa.ok }, "machine/generate-image: salvo v2");
    res.json({ ok: true, asset_storage_path: storagePath, prompt_used: finalPrompt, template_used: templateId, qa });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Machine: publicar criativo no Instagram ───────────────────────────────────
// POST /marketing/machine/creatives/:id/publish
router.post("/marketing/machine/creatives/:id/publish", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      publish_mode:     z.enum(["immediate", "scheduled"]).default("immediate"),
      scheduled_at:     z.string().datetime().optional().nullable(),
      caption_override: z.string().optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    const { publish_mode, scheduled_at, caption_override } = parsed.data;
    const isSuperAdmin = req.user?.isSuperAdmin;

    const [creative] = await db.select().from(machineCreatives).where(eq(machineCreatives.id, id)).limit(1);
    if (!creative) return res.status(404).json({ error: "Criativo não encontrado" });

    const companySlug = creative.companySlug;
    if (!isSuperAdmin) {
      const slug = await getTenantSlug(req.userTenantIds?.[0] ?? "");
      if (slug !== companySlug) return res.status(403).json({ error: "Sem acesso" });
    }

    if (!creative.assetStoragePath) {
      return res.status(422).json({ error: "Criativo sem imagem gerada. Execute generate-image primeiro." });
    }

    const caption = caption_override?.trim() || creative.legenda?.trim() || creative.hook?.trim() || "";
    if (!caption) return res.status(422).json({ error: "Criativo sem legenda ou hook — defina um texto antes de publicar" });

    const domain = (process.env["REPLIT_DOMAINS"] ?? "").split(",")[0]?.trim();
    if (!domain) return res.status(500).json({ error: "REPLIT_DOMAINS não configurado" });
    const imageUrl = `https://${domain}/api/storage${creative.assetStoragePath}`;

    const [igAccountRow, igTokenTenantRow, webhookTenantRow] = await Promise.all([
      db.select().from(mentorSettings).where(eq(mentorSettings.key, `instagram_account_id_${companySlug}`)).limit(1).then(r => r[0]),
      db.select().from(mentorSettings).where(eq(mentorSettings.key, `instagram_access_token_${companySlug}`)).limit(1).then(r => r[0]),
      db.select().from(mentorSettings).where(eq(mentorSettings.key, `n8n_instagram_publish_webhook_${companySlug}`)).limit(1).then(r => r[0]),
    ]);

    const igAccountId = igAccountRow?.value ?? null;
    if (!igAccountId) {
      return res.status(422).json({
        error: `Conta Instagram não configurada para "${companySlug}". Configure instagram_account_id_${companySlug} em Mentor → Configurações.`,
      });
    }

    // A publicação usa somente o token configurado para o tenant.
    // Tokens de usuário e globais não podem servir como fallback entre empresas.
    const accessToken = igTokenTenantRow?.value ?? null;
    if (!accessToken) {
      return res.status(422).json({
        error: `Token de acesso Instagram não configurado. Cole o token no campo "Renovar token" em Mentor → Configurações e clique em "Converter e salvar".`,
        missing_key: `instagram_access_token_${companySlug}`,
      });
    }
    const webhookPath = webhookTenantRow?.value?.trim();
    if (!webhookPath) {
      return res.status(422).json({
        error: `Webhook n8n não configurado para "${companySlug}". Configure n8n_instagram_publish_webhook_${companySlug}.`,
      });
    }
    req.log.info({ companySlug, webhookPath, usedTenantKey: !!webhookTenantRow }, "machine/publish: webhook resolved");

    const [pub] = await db.insert(campaignPublications).values({
      companySlug,
      campaignId:        creative.campaignBlueprintId,
      contentItemId:     null,
      assetId:           null,
      channel:           "instagram",
      caption,
      scheduledAt:       publish_mode === "scheduled" && scheduled_at ? new Date(scheduled_at) : null,
      externalAccountId: igAccountId,
      status:            "scheduled",
    }).returning();

    await db.update(machineCreatives)
      .set({ publicationId: pub.id, updatedAt: new Date() })
      .where(eq(machineCreatives.id, id));

    let n8nError: string | null = null;
    try {
      await triggerWebhook(webhookPath, {
        publication_id:       pub.id,
        company_slug:         companySlug,
        instagram_account_id: igAccountId,
        caption,
        image_url:            imageUrl,
        publish_mode,
        scheduled_at:         scheduled_at ?? null,
        access_token:         accessToken,
      }, companySlug as "r2pb" | "mirage" | "moda_conecta");
    } catch (err: any) {
      n8nError = err.message;
      await db.update(campaignPublications)
        .set({ status: "failed", errorMessage: `n8n trigger falhou: ${err.message}` })
        .where(eq(campaignPublications.id, pub.id));
    }

    // Sempre mantém "in_production" após disparar — n8n responde 200 imediatamente
    // mas executa de forma assíncrona; só marca "published" quando confirmado manualmente
    // ou via callback do n8n. Isso evita falsos positivos de "Publicado".
    if (n8nError) {
      await db.update(machineCreatives)
        .set({ statusAprovacao: "in_production", updatedAt: new Date() })
        .where(eq(machineCreatives.id, id));
    }
    // n8n acionado com sucesso — mantém "in_production", usuário confirma manualmente

    req.log.info({ creative_id: id, companySlug, publish_mode, webhookPath, publication_id: pub.id, n8n_error: n8nError }, "machine/publish triggered");

    res.status(n8nError ? 202 : 200).json({
      ok:             !n8nError,
      publication_id: pub.id,
      status:         n8nError ? "failed" : "pending_confirmation",
      image_url:      imageUrl,
      webhook_used:   webhookPath,
      error:          n8nError ?? undefined,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /marketing/machine/generate-campaign — gera campanha via n8n + GPT-4o
router.post("/marketing/machine/generate-campaign", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const companySlug: string = (await resolveSlug(req, true)) ?? "";
    if (!companySlug) return res.status(400).json({ error: "company_slug obrigatório" });

    const { period_days = 30, primary_channel = "Instagram", business_goal = "" } = req.body;

    // Ler brand blueprint
    const [brandRow] = await db.select().from(brandBlueprints).where(eq(brandBlueprints.companySlug, companySlug)).limit(1);
    if (!brandRow) return res.status(400).json({ error: "Brand Foundation não encontrado. Preencha o Brand Foundation antes de gerar uma campanha." });

    const brand = drizzleBrandToApi(brandRow);
    const suf = calcBrandSuficiency(brand);
    if (suf.level === "incompleto") return res.status(400).json({ error: "Brand Foundation insuficiente. Preencha mais campos antes de gerar uma campanha." });

    // Ler config n8n
    const settingRows = await db.select().from(mentorSettings).where(inArray(mentorSettings.key, ["n8n_base_url", "n8n_api_key"]));
    const settings: Record<string, string> = {};
    settingRows.forEach(r => { settings[r.key] = r.value ?? ""; });
    const n8nBase = (settings["n8n_base_url"] ?? process.env.N8N_BASE_URL ?? "").replace(/\/$/, "");
    if (!n8nBase) return res.status(500).json({ error: "n8n não configurado" });

    // Chamar webhook n8n
    const webhookRes = await fetch(`${n8nBase}/webhook/athos-strategic-campaign-planner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_slug: companySlug, brand_foundation: brand, period_days, primary_channel, business_goal }),
    });
    if (!webhookRes.ok) {
      const errText = await webhookRes.text();
      return res.status(502).json({ error: `n8n retornou erro: ${webhookRes.status} — ${errText.slice(0, 200)}` });
    }

    const plan = await webhookRes.json() as Record<string, any>;
    if (plan.error) return res.status(502).json({ error: `Erro no plano gerado: ${plan.error}` });

    // Montar direção criativa como texto
    const cd = plan.creative_direction ?? {};
    const direcao = [
      cd.mood ? `Tom: ${cd.mood}` : null,
      cd.visual_universe ? `Universo visual: ${cd.visual_universe}` : null,
      cd.mandatory_elements?.length ? `Elementos obrigatórios: ${cd.mandatory_elements.join(", ")}` : null,
      cd.forbidden_elements?.length ? `Evitar: ${cd.forbidden_elements.join(", ")}` : null,
    ].filter(Boolean).join(" | ");

    // Salvar campanha gerada
    const startDate = new Date().toISOString().slice(0, 10);
    const [row] = await db.insert(campaignBlueprints).values({
      companySlug,
      nome: plan.campaign_name ?? `Campanha ${period_days}d — ${primary_channel}`,
      objetivo: plan.main_goal ?? null,
      produtoFoco: plan.core_offer ?? null,
      promessaCentral: plan.core_promise ?? null,
      problemaCentral: plan.central_problem ?? null,
      desejoCentral: plan.central_desire ?? null,
      publicoPrincipal: brand.publico_principal ?? null,
      objecoes: Array.isArray(plan.priority_objections) ? plan.priority_objections : [],
      angulos: Array.isArray(plan.angles) ? plan.angles : [],
      pilares: Array.isArray(plan.content_pillars) ? plan.content_pillars : [],
      ctaPrincipal: plan.cta_primary ?? null,
      direcaoCriativa: direcao || null,
      status: "rascunho",
      ...(({ periodDays: period_days, startDate, autoScheduleEnabled: true, autoPublishEnabled: false, defaultSlotTime: "09:00" }) as any),
    } as any).returning();

    // Auto-generate calendar slots using weekly_plan stage foci
    const weeklyPlan = Array.isArray(plan.weekly_plan) ? plan.weekly_plan : [];
    await generateSlotsForCampaign({
      campaignId: row.id,
      companySlug,
      periodDays: period_days,
      startDate: new Date(startDate),
      defaultSlotTime: "09:00",
      channel: primary_channel.startsWith("Instagram") ? primary_channel : "Instagram Feed",
      weeklyPlan,
    }).catch(() => {});

    const api = drizzleCampaignToApi(row);
    res.json({
      ok: true,
      campaign: { ...api, suficiency: calcCampaignSuficiency(api) },
      executive_summary: plan.executive_summary ?? null,
      weekly_plan: weeklyPlan,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Schedule Slots CRUD ────────────────────────────────────────────────────────

// GET /marketing/machine/campaigns-bp/:id/schedule
router.get("/marketing/machine/campaigns-bp/:id/schedule", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const campaignId = req.params.id;
    const slots = await db
      .select()
      .from(campaignScheduleSlots)
      .where(eq(campaignScheduleSlots.campaignBlueprintId, campaignId))
      .orderBy(asc(campaignScheduleSlots.slotOrder));

    // Enrich with creative headline/canal for display
    const creativeIds = slots.filter(s => s.creativeId).map(s => s.creativeId!);
    let creativesMap: Record<string, { headline: string | null; canal: string | null; status_aprovacao: string; asset_storage_path: string | null }> = {};
    if (creativeIds.length > 0) {
      const creatives = await db
        .select({ id: machineCreatives.id, headline: machineCreatives.headline, canal: machineCreatives.canal, statusAprovacao: machineCreatives.statusAprovacao, assetStoragePath: machineCreatives.assetStoragePath })
        .from(machineCreatives)
        .where(inArray(machineCreatives.id, creativeIds));
      for (const c of creatives) {
        creativesMap[c.id] = { headline: c.headline, canal: c.canal, status_aprovacao: c.statusAprovacao, asset_storage_path: c.assetStoragePath };
      }
    }

    const enriched = slots.map(s => ({
      id: s.id,
      campaign_blueprint_id: s.campaignBlueprintId,
      company_slug: s.companySlug,
      creative_id: s.creativeId,
      creative: s.creativeId ? creativesMap[s.creativeId] ?? null : null,
      channel: s.channel,
      scheduled_at: s.scheduledAt,
      slot_order: s.slotOrder,
      stage_focus: s.stageFocus,
      status: s.status,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
    }));

    res.json({ ok: true, slots: enriched });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /marketing/machine/campaigns-bp/:id/schedule/generate — regenera slots
router.post("/marketing/machine/campaigns-bp/:id/schedule/generate", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [camp] = await db.select().from(campaignBlueprints).where(eq(campaignBlueprints.id, req.params.id)).limit(1);
    if (!camp) return res.status(404).json({ error: "Campanha não encontrada" });
    const api = drizzleCampaignToApi(camp);
    const pd = (req.body.period_days ? parseInt(req.body.period_days, 10) : api.period_days) as number ?? 30;
    const sd = (req.body.start_date ?? api.start_date ?? new Date().toISOString().slice(0, 10)) as string;
    const st = (req.body.default_slot_time ?? api.default_slot_time ?? "09:00") as string;
    await generateSlotsForCampaign({ campaignId: camp.id, companySlug: camp.companySlug, periodDays: pd, startDate: new Date(sd), defaultSlotTime: st });
    const slots = await db.select().from(campaignScheduleSlots).where(eq(campaignScheduleSlots.campaignBlueprintId, camp.id)).orderBy(asc(campaignScheduleSlots.slotOrder));
    res.json({ ok: true, slots_created: slots.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /marketing/machine/slots/:id — assign/unassign creative or update slot
router.patch("/marketing/machine/slots/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (req.body.creative_id !== undefined) updates.creativeId  = req.body.creative_id;
    if (req.body.status      !== undefined) updates.status      = req.body.status;
    if (req.body.channel     !== undefined) updates.channel     = req.body.channel;
    if (req.body.scheduled_at !== undefined) updates.scheduledAt = new Date(req.body.scheduled_at);
    if (req.body.stage_focus !== undefined) updates.stageFocus  = req.body.stage_focus;

    const [slot] = await db.update(campaignScheduleSlots).set(updates as any).where(eq(campaignScheduleSlots.id, req.params.id)).returning();
    if (!slot) return res.status(404).json({ error: "Slot não encontrado" });

    // If assigning a creative, stamp scheduledAt on it
    if (req.body.creative_id) {
      await db.update(machineCreatives).set({ scheduledAt: slot.scheduledAt, updatedAt: new Date() } as any).where(eq(machineCreatives.id, req.body.creative_id));
    }

    res.json({ ok: true, slot });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /marketing/machine/slots/:id/creative — remove creative from slot
router.delete("/marketing/machine/slots/:id/creative", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    await unassignCreativeFromSlot(req.params.id);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Mirage Growth OS — admin overview (superAdmin only) ────────────────────
// GET /marketing/growth/overview
// Exposes read-only aggregated data from growth_* tables + provider availability
// for the front-end dashboard. Distinct from /internal/growth/* (x-internal-key,
// used by n8n/server-to-server); this route is browser-session-auth only.
router.get("/marketing/growth/overview", requireAuth, requireSuperAdmin, async (_req: AuthenticatedRequest, res) => {
  try {
    const [campaigns, assets, providerRuns] = await Promise.all([
      db.select().from(growthCampaigns).orderBy(desc(growthCampaigns.createdAt)),
      db.select().from(growthAssets).orderBy(desc(growthAssets.createdAt)).limit(200),
      db.select().from(growthProviderRuns).orderBy(desc(growthProviderRuns.createdAt)).limit(50),
    ]);

    const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
    const assetsGenerated = assets.filter((a) =>
      ["generated", "awaiting_approval", "approved", "published"].includes(a.status)
    ).length;
    const approvalQueue = assets
      .filter((a) => a.status === "awaiting_approval")
      .slice(0, 20)
      .map((a) => ({
        id: a.id,
        title: a.title,
        asset_type: a.assetType,
        provider: a.provider,
        status: a.status,
        created_at: a.createdAt,
        output_url: a.outputUrl,
      }));

    const availability = getProviderAvailability();
    const providers = [
      { name: "heygen", label: "HeyGen", active: availability.heygen, description: "Vídeo com avatar" },
      { name: "banana", label: "Banana (Gemini)", active: availability.banana, description: "Imagem — rápida/genérica" },
      { name: "midjourney", label: "Midjourney", active: availability.midjourney, description: "Imagem premium — bloqueado (sem bridge externo)" },
      { name: "openai", label: "OpenAI", active: availability.openai, description: "Copy / headline / script / CTA" },
    ];
    const activeProviders = providers.filter((p) => p.active).length;

    // ── Métricas agregadas para o cockpit executivo ──────────────────────────
    const processingJobs = assets.filter((a) => ["requested", "generating"].includes(a.status)).length;
    const failedAssets = assets.filter((a) => a.status === "failed").length;
    const approvedCount = assets.filter((a) => ["approved", "published"].includes(a.status)).length;
    const rejectedCount = assets.filter((a) => a.status === "rejected").length;
    const decidedCount = approvedCount + rejectedCount;
    const approvalRate = decidedCount > 0 ? Math.round((approvedCount / decidedCount) * 100) : null;

    const genTimes = assets.map((a) => a.generationTimeMs).filter((v): v is number => typeof v === "number" && v > 0);
    const avgGenerationTimeMs = genTimes.length > 0 ? Math.round(genTimes.reduce((s, v) => s + v, 0) / genTimes.length) : null;

    const DAYS = 14;
    const dayKeys: string[] = [];
    const now = new Date();
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dayKeys.push(d.toISOString().slice(0, 10));
    }
    const byDayMap = new Map<string, number>(dayKeys.map((k) => [k, 0]));
    for (const a of assets) {
      if (!a.createdAt) continue;
      const key = new Date(a.createdAt).toISOString().slice(0, 10);
      if (byDayMap.has(key)) byDayMap.set(key, (byDayMap.get(key) ?? 0) + 1);
    }
    const assetsByDay = dayKeys.map((k) => ({ date: k, count: byDayMap.get(k) ?? 0 }));

    const byProviderMap = new Map<string, number>();
    const byTypeMap = new Map<string, number>();
    const byStatusMap = new Map<string, number>();
    for (const a of assets) {
      byProviderMap.set(a.provider, (byProviderMap.get(a.provider) ?? 0) + 1);
      byTypeMap.set(a.assetType, (byTypeMap.get(a.assetType) ?? 0) + 1);
      byStatusMap.set(a.status, (byStatusMap.get(a.status) ?? 0) + 1);
    }
    const assetsByProvider = Array.from(byProviderMap.entries()).map(([provider, count]) => ({ provider, count }));
    const assetsByType = Array.from(byTypeMap.entries()).map(([type, count]) => ({ type, count }));
    const statusDistribution = Array.from(byStatusMap.entries()).map(([status, count]) => ({ status, count }));

    const failedRuns = providerRuns.filter((r) => r.status === "failed").slice(0, 10).map((r) => ({
      id: r.id,
      provider: r.provider,
      run_type: r.runType,
      error_message: r.errorMessage,
      created_at: r.createdAt,
    }));

    res.json({
      ok: true,
      status_cards: {
        active_campaigns: activeCampaigns,
        assets_generated: assetsGenerated,
        active_providers: activeProviders,
        approval_queue: approvalQueue.length,
        processing_jobs: processingJobs,
        failed_assets: failedAssets,
        approval_rate: approvalRate,
        avg_generation_time_ms: avgGenerationTimeMs,
      },
      providers,
      approval_queue: approvalQueue,
      recent_provider_runs: providerRuns.slice(0, 20).map((r) => ({
        id: r.id,
        provider: r.provider,
        run_type: r.runType,
        status: r.status,
        error_message: r.errorMessage,
        created_at: r.createdAt,
      })),
      failed_runs: failedRuns,
      campaigns: campaigns.slice(0, 20).map((c) => ({
        id: c.id,
        name: c.name,
        objective: c.objective,
        channel: c.channel,
        status: c.status,
        created_at: c.createdAt,
      })),
      charts: {
        assets_by_day: assetsByDay,
        assets_by_provider: assetsByProvider,
        assets_by_type: assetsByType,
        status_distribution: statusDistribution,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Mirage Growth OS — visão de negócio cross-tenant (superAdmin only) ─────
// Agrega tenants/planos/MRR, funil comercial (Helena) e funil de leads/comunidade
// para dar visibilidade da estratégia de marketing + vendas de todos os tenants.
// Usada tanto pelo endpoint HTTP abaixo quanto pela capability `get_business_overview`
// do bridge do ATHOS (leitura executiva, server-to-server, sem exposição a usuários comuns).
export async function getBusinessOverviewData() {
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug, plan, assinatura_status, assinatura_expira_em, created_at");

    if (tenantsError) {
      throw new Error("Falha ao carregar tenants: " + tenantsError.message);
    }

    const tenantRows = tenants ?? [];
    const planoPreco = new Map(PLANOS.map((p) => [p.id, p.preco_mensal]));
    let mrr = 0;
    const byPlan = new Map<string, number>();
    const byStatus = new Map<string, number>();
    for (const t of tenantRows as any[]) {
      const status = t.assinatura_status ?? "desconhecido";
      byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
      if (t.plan) byPlan.set(t.plan, (byPlan.get(t.plan) ?? 0) + 1);
      if (status === "ativo" || status === "active") {
        mrr += planoPreco.get(t.plan) ?? 0;
      }
    }

    const [helenaMigrations, leads, preCadastros] = await Promise.all([
      db.select().from(helenaCardMigrations).orderBy(desc(helenaCardMigrations.migratedAt)).limit(1000),
      db.select().from(leadsEspelho).orderBy(desc(leadsEspelho.createdAt)).limit(1000),
      db.select().from(comunidadePreCadastros).orderBy(desc(comunidadePreCadastros.createdAt)).limit(1000),
    ]);

    const wonCount = helenaMigrations.filter((m) => m.outcome === "WON").length;
    const lostCount = helenaMigrations.filter((m) => m.outcome === "LOST").length;
    const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : null;
    const wonValueCents = helenaMigrations
      .filter((m) => m.outcome === "WON" && m.monetaryAmount)
      .reduce((sum, m) => sum + Math.round(parseFloat(m.monetaryAmount as unknown as string) * 100), 0);

    const MONTHS = 6;
    const monthKeys: string[] = [];
    const now = new Date();
    for (let i = MONTHS - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const funnelByMonth = monthKeys.map((key) => {
      const won = helenaMigrations.filter((m) => m.migratedAt && new Date(m.migratedAt).toISOString().slice(0, 7) === key && m.outcome === "WON").length;
      const lost = helenaMigrations.filter((m) => m.migratedAt && new Date(m.migratedAt).toISOString().slice(0, 7) === key && m.outcome === "LOST").length;
      return { month: key, won, lost };
    });

    const leadsAgendados = leads.filter((l) => l.agendou).length;
    const leadsPendentes = leads.filter((l) => !l.agendou).length;
    const leadsFollowupEnviado = leads.filter((l) => l.followupSent).length;

    const preCadastroByStatus = new Map<string, number>();
    for (const p of preCadastros) {
      preCadastroByStatus.set(p.status, (preCadastroByStatus.get(p.status) ?? 0) + 1);
    }

    // ── Backlog comercial / "onde agir agora" ──────────────────────────────
    const leadsAguardandoAcaoList = leads
      .filter((l) => !l.agendou && !l.followupSent)
      .map((l) => ({ id: l.id, nome: l.nome, email: l.email, whatsapp: l.whatsapp, created_at: l.createdAt }));
    const leadsFollowupSemRetornoList = leads
      .filter((l) => !l.agendou && l.followupSent)
      .map((l) => ({ id: l.id, nome: l.nome, email: l.email, whatsapp: l.whatsapp, created_at: l.createdAt }));
    const leadsAguardandoAcao = leadsAguardandoAcaoList.length;
    const leadsFollowupSemRetorno = leadsFollowupSemRetornoList.length;

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const perdasRecentes30dList = helenaMigrations
      .filter((m) => m.outcome === "LOST" && m.migratedAt && nowMs - new Date(m.migratedAt).getTime() <= THIRTY_DAYS_MS)
      .map((m) => ({
        id: m.id,
        card_title: m.cardTitle,
        contact_name: m.contactName,
        contact_phone: m.contactPhone,
        monetary_amount: m.monetaryAmount,
        source_step_title: m.sourceStepTitle,
        migrated_at: m.migratedAt,
      }));
    const perdasRecentes30d = perdasRecentes30dList.length;

    const tenantsExpirando = (tenantRows as any[])
      .filter((t) => t.assinatura_expira_em)
      .map((t) => ({
        id: t.id,
        name: t.name,
        plan: t.plan,
        expira_em: t.assinatura_expira_em as string,
        dias_restantes: Math.ceil(
          (new Date(t.assinatura_expira_em).getTime() - nowMs) / (24 * 60 * 60 * 1000)
        ),
      }))
      .filter((t) => t.dias_restantes <= 30)
      .sort((a, b) => a.dias_restantes - b.dias_restantes);

    const upgradeCandidatos = (tenantRows as any[])
      .filter((t) => (t.assinatura_status === "ativo" || t.assinatura_status === "active") && (t.plan === "starter" || t.plan === "pro"))
      .map((t) => ({ id: t.id, name: t.name, plan: t.plan }));

    return {
      ok: true,
      tenants: {
        total: tenantRows.length,
        mrr_cents: mrr * 100,
        by_plan: Array.from(byPlan.entries()).map(([plan, count]) => ({ plan, count })),
        by_status: Array.from(byStatus.entries()).map(([status, count]) => ({ status, count })),
        list: tenantRows.map((t: any) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          plan: t.plan,
          status: t.assinatura_status,
          expira_em: t.assinatura_expira_em,
          created_at: t.created_at,
        })),
      },
      sales_funnel: {
        won: wonCount,
        lost: lostCount,
        win_rate: winRate,
        won_value_cents: wonValueCents,
        by_month: funnelByMonth,
      },
      leads_funnel: {
        total: leads.length,
        agendados: leadsAgendados,
        pendentes: leadsPendentes,
        followup_enviado: leadsFollowupEnviado,
      },
      community_funnel: {
        total: preCadastros.length,
        by_status: Array.from(preCadastroByStatus.entries()).map(([status, count]) => ({ status, count })),
      },
      backlog: {
        leads_aguardando_acao: leadsAguardandoAcao,
        leads_aguardando_acao_list: leadsAguardandoAcaoList,
        leads_followup_sem_retorno: leadsFollowupSemRetorno,
        leads_followup_sem_retorno_list: leadsFollowupSemRetornoList,
        perdas_recentes_30d: perdasRecentes30d,
        perdas_recentes_30d_list: perdasRecentes30dList,
        tenants_expirando: tenantsExpirando,
        upgrade_candidatos: upgradeCandidatos,
      },
    };
}

// GET /marketing/growth/business-overview
router.get("/marketing/growth/business-overview", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const overview = await getBusinessOverviewData();
    res.json(overview);
  } catch (err: any) {
    req.log.error({ error: err.message }, "Erro ao gerar business-overview");
    res.status(500).json({ error: err.message });
  }
});

// ── Lead Funnel — visão operacional da jornada de leads ───────────────────────
// GET /marketing/lead-funnel?company_slug=r2pb
// Agrega dados reais de leads_espelho + comercial_leads em 8 buckets operacionais.
router.get("/marketing/lead-funnel", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const slug = (req.query["company_slug"] as string | undefined)?.trim();
    if (!slug) {
      return res.status(400).json({ error: "company_slug é obrigatório — sem fallback silencioso para nenhum tenant" });
    }

    // ── leads_espelho: tenant_id = slug direto (ex: 'r2pb') ──────────────────
    // Essa tabela guarda o slug como tenant_id, não o UUID do Supabase.
    const espelhoRows = await db
      .select()
      .from(leadsEspelho)
      .where(eq(leadsEspelho.tenantId, slug));

    const captado      = espelhoRows.length;
    const agendado     = espelhoRows.filter(r => r.agendou).length;
    const sem_resposta = espelhoRows.filter(r => !r.agendou && !r.followupSent).length;
    const em_nutricao  = espelhoRows.filter(r => !r.agendou && r.followupSent).length;
    const em_resgate   = 0; // TODO: aguarda tracking de rescue no DB

    // ── comercial_leads: pode ter UUID ou slug — busca por ambos ─────────────
    // Tenta via Supabase (pode retornar null se tabela não existir no projeto)
    let tenantUuid: string | null = null;
    try {
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("slug", slug)
        .single();
      tenantUuid = tenant?.id ?? null;
    } catch {}

    // Busca comercial_leads por UUID (se resolvido) OU por slug direto
    let comercialRows: typeof comercialLeads.$inferSelect[] = [];
    if (tenantUuid) {
      comercialRows = await db
        .select()
        .from(comercialLeads)
        .where(eq(comercialLeads.tenantId, tenantUuid));
    }
    // Se não achou por UUID ou UUID null, tenta pelo slug direto
    if (comercialRows.length === 0) {
      comercialRows = await db
        .select()
        .from(comercialLeads)
        .where(eq(comercialLeads.tenantId, slug));
    }
    // Fallback: se ainda vazio e slug=r2pb, busca todos (único tenant ativo)
    if (comercialRows.length === 0 && slug === "r2pb") {
      comercialRows = await db.select().from(comercialLeads);
    }

    const em_atendimento  = comercialRows.filter(r => r.status === "aberto" && !r.closedAt).length;
    const pipeline_vendas = comercialRows.filter(r => r.pipelineKey && !r.closedAt).length;
    const perdido         = comercialRows.filter(r => !!r.closedAt).length;

    // ── Metadados ─────────────────────────────────────────────────────────────
    const total_espelho   = captado;
    const total_comercial = comercialRows.length;
    const taxa_agendamento = captado > 0
      ? Math.round((agendado / captado) * 100)
      : 0;
    const taxa_fechamento = (em_atendimento + perdido + pipeline_vendas) > 0
      ? Math.round((pipeline_vendas / (em_atendimento + perdido + pipeline_vendas)) * 100)
      : 0;

    res.json({
      company_slug: slug,
      tenant_id: tenantUuid ?? slug,
      funil_nome: slug === "r2pb" ? "Quick Threads — R2PB Confecções" : slug,
      buckets: {
        captado,
        sem_resposta,
        em_nutricao,
        em_resgate,
        em_atendimento,
        agendado,
        pipeline_vendas,
        perdido,
      },
      meta: {
        total_espelho,
        total_comercial,
        taxa_agendamento_pct: taxa_agendamento,
        taxa_fechamento_pct: taxa_fechamento,
        data_sources: ["leads_espelho", "comercial_leads"],
      },
      generated_at: new Date().toISOString(),
    });
  } catch (err: any) {
    req.log.error({ error: err.message }, "Erro ao gerar lead-funnel");
    res.status(500).json({ error: err.message });
  }
});

// ── Pilotos Criativos — laboratório editorial de assets AI ────────────────────

// GET /marketing/pilotos/assets — lista todos os assets de growth_assets para r2pb e mirage
router.get("/marketing/pilotos/assets", requireAuth, requireSuperAdmin, async (_req: AuthenticatedRequest, res) => {
  const assets = await db
    .select()
    .from(growthAssets)
    .where(inArray(growthAssets.tenantId, ["r2pb", "mirage"]))
    .orderBy(asc(growthAssets.createdAt));

  res.json({ ok: true, assets });
});

// POST /marketing/pilotos/assets/:assetId/approve — aprova e envia para campaign_assets
router.post("/marketing/pilotos/assets/:assetId/approve", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { assetId } = req.params as { assetId: string };

  const [asset] = await db
    .select()
    .from(growthAssets)
    .where(eq(growthAssets.id, assetId))
    .limit(1);

  if (!asset) {
    return res.status(404).json({ error: "Asset não encontrado" });
  }
  if (!asset.outputUrl) {
    return res.status(422).json({ error: "Asset sem URL de output — não pode ser aprovado" });
  }

  // Atualiza status no growth_assets
  await db
    .update(growthAssets)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(growthAssets.id, assetId));

  // Cria registro em campaign_assets para disponibilizar na Máquina de Marketing
  const promptInput = asset.promptInput as Record<string, unknown> | null;
  const promptText = promptInput?.prompt as string | undefined;

  const [inserted] = await db.insert(campaignAssets).values({
    companySlug: asset.tenantId,
    campaignId: asset.campaignId ?? "piloto-ia",
    contentItemId: null,
    assetType: asset.assetType === "image" ? "image" : "video",
    storagePath: asset.outputUrl,            // já no formato /objects/...
    promptUsed: promptText ?? null,
    status: "ready",
  }).returning({ id: campaignAssets.id });

  req.log.info({ assetId, tenantId: asset.tenantId, campaignAssetId: inserted.id }, "pilotos/approve: asset aprovado e enviado para campaign_assets");

  res.json({ ok: true, campaign_asset_id: inserted.id });
});

// POST /marketing/pilotos/assets/:assetId/status — atualiza status editorial (rejected etc.)
router.post("/marketing/pilotos/assets/:assetId/status", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { assetId } = req.params as { assetId: string };
  const { status } = req.body as { status: string };

  const allowed = ["awaiting_approval", "rejected"] as const;
  if (!allowed.includes(status as typeof allowed[number])) {
    return res.status(400).json({ error: `Status inválido: ${status}` });
  }

  await db
    .update(growthAssets)
    .set({ status: status as typeof allowed[number], updatedAt: new Date() })
    .where(eq(growthAssets.id, assetId));

  res.json({ ok: true, status });
});

// POST /marketing/pilotos/assets/:assetId/publish — publica ou agenda
// R2PB  → dispara webhook n8n do Instagram (mesmo fluxo da Máquina de Marketing)
// Outros → fila interna apenas
router.post("/marketing/pilotos/assets/:assetId/publish", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { assetId } = req.params as { assetId: string };
  const { destination, mode = "immediate", scheduled_at, caption_override } = req.body as {
    destination?: string; mode?: string; scheduled_at?: string; caption_override?: string;
  };

  if (!["feed", "story", "reel"].includes(destination ?? "")) {
    return res.status(400).json({ error: "destination obrigatório: feed | story | reel" });
  }
  const [asset] = await db.select().from(growthAssets).where(eq(growthAssets.id, assetId)).limit(1);
  if (!asset) return res.status(404).json({ error: "Asset não encontrado" });
  if (!["approved", "scheduled"].includes(asset.status)) {
    return res.status(422).json({ error: "Apenas assets aprovados/agendados podem ser publicados" });
  }

  const isScheduled = mode === "scheduled" && !!scheduled_at;
  const now = new Date();

  // Grava status no DB primeiro (independente do tenant)
  await db.update(growthAssets).set({
    status:             isScheduled ? ("scheduled" as any) : ("published" as any),
    publishDestination: destination!,
    scheduledAt:        isScheduled ? new Date(scheduled_at!) : null,
    publishedAt:        isScheduled ? null : now,
    updatedAt:          now,
  }).where(eq(growthAssets.id, assetId));

  // ── R2PB: publica direto na Meta Graph API (sem n8n) ──────────────────────
  if (asset.tenantId === "r2pb" && !isScheduled) {
    try {
      const domain = (process.env["REPLIT_DOMAINS"] ?? "").split(",")[0]?.trim();
      if (!domain) throw new Error("REPLIT_DOMAINS não configurado");
      if (!asset.outputUrl) throw new Error("Asset sem imagem gerada (outputUrl vazio)");

      const imageUrl    = `https://${domain}/api/storage${asset.outputUrl}`;
      const caption     = (caption_override ?? asset.caption ?? "").trim();
      const GRAPH       = "https://graph.facebook.com/v19.0";

      // Credenciais R2PB, sem fallback para token de usuário ou global.
      const [igAccountRow, igTenantTokenRow] = await Promise.all([
        db.select().from(mentorSettings).where(eq(mentorSettings.key, "instagram_account_id_r2pb")).limit(1).then(r => r[0]),
        db.select().from(mentorSettings).where(eq(mentorSettings.key, "instagram_access_token_r2pb")).limit(1).then(r => r[0]),
      ]);

      const igAccountId = igAccountRow?.value ?? null;
      const accessToken = igTenantTokenRow?.value ?? null;

      if (!igAccountId || !accessToken) {
        req.log.warn({ assetId, igAccountId: !!igAccountId, accessToken: !!accessToken },
          "pilotos/publish r2pb: credenciais Instagram não configuradas — publicado só na fila interna");
        return res.json({ ok: true, status: "published", destination, instagram: false,
          instagram_warning: "Configure instagram_account_id_r2pb e instagram_access_token_r2pb em Mentor → Configurações." });
      }

      // Passo 1 — criar container de mídia
      const mediaType = destination === "story" || destination === "reel" ? "STORIES" : undefined;
      const containerBody: Record<string, string> = {
        image_url:    imageUrl,
        caption,
        access_token: accessToken,
      };
      if (mediaType) containerBody["media_type"] = mediaType;

      const containerRes = await fetch(`${GRAPH}/${igAccountId}/media`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(containerBody),
      });
      const containerJson = await containerRes.json() as Record<string, any>;
      if (!containerRes.ok || !containerJson.id) {
        throw new Error(`Criar container falhou: ${JSON.stringify(containerJson)}`);
      }
      const containerId = containerJson.id as string;
      req.log.info({ assetId, containerId }, "pilotos/publish r2pb: container criado");

      // Passo 2 — aguardar container estar FINISHED (max 30s)
      let attempts = 0;
      while (attempts < 10) {
        await new Promise(r => setTimeout(r, 3000));
        const statusRes  = await fetch(`${GRAPH}/${containerId}?fields=status_code&access_token=${accessToken}`);
        const statusJson = await statusRes.json() as Record<string, any>;
        req.log.info({ containerId, status_code: statusJson.status_code, attempt: attempts + 1 }, "pilotos/publish r2pb: container status");
        if (statusJson.status_code === "FINISHED") break;
        if (statusJson.status_code === "ERROR" || statusJson.error) {
          throw new Error(`Container em erro: ${JSON.stringify(statusJson)}`);
        }
        attempts++;
      }

      // Passo 3 — publicar
      const publishRes  = await fetch(`${GRAPH}/${igAccountId}/media_publish`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ creation_id: containerId, access_token: accessToken }),
      });
      const publishJson = await publishRes.json() as Record<string, any>;
      if (!publishRes.ok || !publishJson.id) {
        throw new Error(`Publicar falhou: ${JSON.stringify(publishJson)}`);
      }

      req.log.info({ assetId, destination, ig_post_id: publishJson.id }, "pilotos/publish r2pb: ✅ publicado no Instagram");
      return res.json({ ok: true, status: "published", destination, instagram: true, ig_post_id: publishJson.id });

    } catch (err: any) {
      req.log.error({ assetId, err: err.message }, "pilotos/publish r2pb: falha Graph API — asset fica na fila interna");
      return res.json({ ok: true, status: "published", destination, instagram: false, instagram_error: err.message });
    }
  }

  // ── Outros tenants (Mirage etc.): fila interna ─────────────────────────────
  req.log.info({ assetId, destination, mode, tenant: asset.tenantId }, "pilotos/publish: fila interna");
  res.json({ ok: true, status: isScheduled ? "scheduled" : "published", destination, instagram: false });
});

// POST /marketing/pilotos/gerar-imagem — dispara geração via R2PB Creative (autenticado, session-based)
// Wrapper do endpoint interno para ser chamado diretamente pela UI do Hub.
router.post("/marketing/pilotos/gerar-imagem", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { image_prompt, creative_type, title, context_note, aspect_ratio, campaign_id, machine_creative_id, provider: providerInput } = req.body as Record<string, string | undefined>;

  if (!image_prompt || String(image_prompt).trim().length < 10) {
    return res.status(400).json({ error: "image_prompt é obrigatório (mínimo 10 caracteres)" });
  }

  const { enrichR2PBPrompt, detectCreativeTypeFromContext, resolveCreativeAxis, resolveSegment } = await import("../../lib/r2pbPromptEnricher");
  const { and: andOp, eq: eqOp } = await import("drizzle-orm");

  const VALID_TYPES = ["streetwear", "fitness", "alfaiataria", "generico", "autoridade_fabrica"];
  const rawType = creative_type ?? "generico";
  const detectedType = detectCreativeTypeFromContext(
    `${image_prompt} ${context_note ?? ""}`,
    VALID_TYPES.includes(rawType) ? (rawType as any) : null,
  );
  const creativeType = detectedType;
  // ✅ VÁLIDO: esta rota (pilotos/gerar-imagem) é exclusivamente para a R2PB.
  // Usa enrichR2PBPrompt, branding e pipeline específicos da R2PB. Não é fluxo genérico.
  const tenantId = "r2pb";

  // Provider selection: "openai-image" → gpt-image-2 | anything else → banana/Gemini
  const useOpenAI = providerInput === "openai-image" || creativeType === "autoridade_fabrica";
  const providerName = useOpenAI ? "openai-image" : "banana";
  // DB enum só aceita "openai" (não "openai-image") — mapear antes de inserir
  const dbProvider = useOpenAI ? "openai" : "banana";

  const enriched     = enrichR2PBPrompt({ imagePrompt: String(image_prompt).trim(), creativeType, contextNote: context_note ?? null });
  const creativeAxis = resolveCreativeAxis(creativeType);
  const segment      = resolveSegment(creativeType);

  req.log.info({ tenantId, creativeType, creativeAxis, segment, providerName, directionApplied: enriched.directionApplied }, "pilotos/gerar-imagem: iniciando");

  const [asset] = await db.insert(growthAssets).values({
    tenantId,
    campaignId: campaign_id ?? null,
    assetType: "image",
    provider: dbProvider as any,
    title: title ?? null,
    promptInput: {
      original_prompt: enriched.originalPrompt,
      enriched_prompt: enriched.enrichedPrompt,
      creative_type: creativeType,
      creative_axis: creativeAxis,
      segment,
      aspect_ratio: aspect_ratio ?? "1:1",
      context_note: context_note ?? null,
      direction_applied: enriched.directionApplied,
      machine_creative_id: machine_creative_id ?? null,
      source: "hub-ui",
    },
    status: "requested",
    createdBy: "hub-ui",
  }).returning();

  const [run] = await db.insert(growthProviderRuns).values({
    tenantId,
    campaignId: campaign_id ?? null,
    assetId: asset.id,
    provider: dbProvider as any,
    runType: "generate",
    status: "queued",
    requestPayload: { image_prompt, creative_type, aspect_ratio, provider: providerName },
  }).returning();

  try {
    await db.update(growthProviderRuns).set({ status: "running", updatedAt: new Date() }).where(eq(growthProviderRuns.id, run.id));
    await db.update(growthAssets).set({ status: "generating", updatedAt: new Date() }).where(eq(growthAssets.id, asset.id));

    const t0 = Date.now();
    let result: { outputUrl: string; storagePath: string; mimeType: string; requestPayload: unknown; responsePayload: unknown };
    if (useOpenAI) {
      const { generateOpenAIImage, aspectRatioToOpenAISize } = await import("../../lib/openaiImageProvider");
      result = await generateOpenAIImage({
        prompt: enriched.enrichedPrompt,
        tenantId,
        campaignId: campaign_id ?? null,
        size: aspectRatioToOpenAISize(aspect_ratio ?? "1:1"),
      });
    } else {
      const { generateBananaImage } = await import("../../lib/bananaProvider");
      result = await generateBananaImage({ prompt: enriched.enrichedPrompt, tenantId, campaignId: campaign_id ?? null });
    }
    const durationMs = Date.now() - t0;

    // Copy FIRST — headline must exist before branding composes it onto the image
    const { applyBrandingToStoredImage } = await import("../../lib/growthAssetBranding");
    const { generateR2PBCopy }           = await import("../../lib/r2pbCopyGenerator");

    let finalUrl      = result.outputUrl;
    let compositionOk = false;
    let copyResult: { headline: string; caption: string; cta: string } | null = null;

    try {
      copyResult = await generateR2PBCopy({ creativeType, creativeAxis, segment, contextNote: context_note ?? null, title: title ?? null, imagePrompt: enriched.originalPrompt, tenantId });
    } catch (e: any) {
      req.log.warn({ err: e?.message }, "pilotos/gerar-imagem: copy generation falhou");
    }

    try {
      finalUrl = await applyBrandingToStoredImage({
        rawStoragePath: result.outputUrl,
        tenantId,
        campaignId: campaign_id ?? null,
        headline: copyResult?.headline ?? null,
        slotType: null, // freeform → always square feed
      });
      compositionOk = true;
    } catch (e: any) {
      req.log.warn({ err: e?.message }, "pilotos/gerar-imagem: branding falhou");
    }

    await db.update(growthProviderRuns).set({ status: "success", requestPayload: result.requestPayload, responsePayload: result.responsePayload, durationMs, updatedAt: new Date() }).where(eq(growthProviderRuns.id, run.id));

    const [updatedAsset] = await db.update(growthAssets).set({
      status: "awaiting_approval",
      outputUrl: finalUrl,
      outputData: result.responsePayload as any,
      generationTimeMs: durationMs,
      compositionApplied: compositionOk,
      sourcePipeline: "v2",
      headline: copyResult?.headline ?? null,
      caption:  copyResult?.caption  ?? null,
      cta:      copyResult?.cta      ?? null,
      updatedAt: new Date(),
    }).where(eq(growthAssets.id, asset.id)).returning();

    // Se machine_creative_id fornecido, atualiza machine_creatives
    if (machine_creative_id) {
      try {
        await db.update(machineCreatives).set({ assetStoragePath: result.outputUrl, imagePromptUsed: enriched.enrichedPrompt, statusAprovacao: "gerado", updatedAt: new Date() }).where(eq(machineCreatives.id, machine_creative_id));
      } catch {}
    }

    req.log.info({ assetId: updatedAsset.id, durationMs }, "pilotos/gerar-imagem: sucesso");
    res.status(201).json({ ok: true, asset: updatedAsset, image_path: result.outputUrl, curation_url: `/api/marketing/pilotos/assets/${updatedAsset.id}` });
  } catch (err: any) {
    const msg = err?.message ?? "Erro desconhecido";
    await db.update(growthProviderRuns).set({ status: "failed", errorMessage: msg, updatedAt: new Date() }).where(eq(growthProviderRuns.id, run.id));
    await db.update(growthAssets).set({ status: "failed", errorMessage: msg, updatedAt: new Date() }).where(eq(growthAssets.id, asset.id));
    req.log.error({ err: msg }, "pilotos/gerar-imagem: falha");
    if (err?.name === "BananaConfigError" || err?.name === "OpenAIImageConfigError") return res.status(503).json({ error: "Provider não configurado", detail: msg });
    res.status(err?.name === "BananaApiError" || err?.name === "OpenAIImageApiError" ? 502 : 500).json({ error: msg });
  }
});

// POST /marketing/pilotos/sync-video/:jobId — verifica status do job HeyGen
router.post("/marketing/pilotos/sync-video/:jobId", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { jobId } = req.params as { jobId: string };
  const { getHeygenVideoJob, normalizeHeygenResponse } = await import("../../lib/heygenProvider");

  const jobStatus = await getHeygenVideoJob(jobId);
  const normalized = normalizeHeygenResponse(jobStatus);

  if (normalized.status === "completed" && normalized.videoUrl) {
    const [run] = await db
      .select()
      .from(growthProviderRuns)
      .where(eq(growthProviderRuns.externalJobId, jobId))
      .limit(1);

    if (run?.assetId) {
      await db
        .update(growthAssets)
        .set({ status: "awaiting_approval", outputUrl: normalized.videoUrl, updatedAt: new Date() })
        .where(eq(growthAssets.id, run.assetId));
      await db
        .update(growthProviderRuns)
        .set({ status: "success", updatedAt: new Date() })
        .where(eq(growthProviderRuns.id, run.id));
    }
  }

  res.json({ ok: true, job_status: normalized.status, video_url: normalized.videoUrl ?? null });
});

// ── Growth Cockpit — dados unificados para o cockpit multi-tenant ─────────────
// GET /marketing/growth/cockpit?tenant=r2pb
// Agrega: leads (classificações Joana), agentes, funil, campanhas, insights

router.get("/marketing/growth/cockpit", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const tenantFilter = (req.query.tenant as string | undefined) ?? null;

    // ── 1. Leads da Joana (lead_conversation_state) ────────────────────────
    const leadsRaw = await pool.query<{
      tenant_id: string; phone: string; lead_name: string | null;
      human_in_control: boolean; human_agent_name: string | null;
      last_activity_at: string; joana_context: string | null;
      conversation_status: string; current_agent: string | null;
    }>(`
      SELECT tenant_id, phone, lead_name, human_in_control, human_agent_name,
             last_activity_at, joana_context, conversation_status, current_agent
      FROM lead_conversation_state
      ${tenantFilter ? "WHERE tenant_id = $1" : ""}
      ORDER BY last_activity_at DESC
      LIMIT 200
    `, tenantFilter ? [tenantFilter] : []);

    const leads = leadsRaw.rows.map((r) => {
      let ctx: Record<string, unknown> = {};
      try { ctx = r.joana_context ? JSON.parse(r.joana_context) : {}; } catch { /* noop */ }
      const clf = (ctx.classificacao as string | undefined) ?? null;
      const passouReeducacao = Boolean(ctx.passou_por_reeducacao);
      const status = r.human_in_control
        ? "handoff_humano"
        : clf === "fit_premium_pro" ? "qualificado_pro"
        : clf === "fit_basico"      ? "qualificado_basic"
        : clf === "reeducar_fit"    ? "em_reeducacao"
        : clf === "nutricao"        ? "nutricao"
        : clf === "baixo_fit"       ? "baixo_fit"
        : clf === "encaminhar_suporte" ? "suporte"
        : "ia_ativa";
      return {
        tenant_id: r.tenant_id,
        phone: r.phone,
        lead_name: r.lead_name,
        classificacao: clf,
        human_in_control: r.human_in_control,
        human_agent_name: r.human_agent_name,
        last_activity_at: r.last_activity_at,
        passou_por_reeducacao: passouReeducacao,
        status,
        segmento: (ctx.segmento as string | undefined) ?? null,
        resumo: (ctx.resumo as string | undefined) ?? null,
        current_agent: r.current_agent ?? null,
      };
    });

    // ── 2. Distribuição por classificação ─────────────────────────────────
    const clfDist = new Map<string, number>();
    for (const l of leads) {
      const key = l.classificacao ?? "em_qualificacao";
      clfDist.set(key, (clfDist.get(key) ?? 0) + 1);
    }
    const classificacoes = Array.from(clfDist.entries()).map(([classificacao, count]) => ({ classificacao, count }));

    // ── 3. Status dos agentes (Joana por tenant) ──────────────────────────
    const agentsByTenant = new Map<string, { total: number; em_ia: number; bloqueados: number; ultimo: string | null }>();
    for (const l of leads) {
      const t = l.tenant_id;
      const cur = agentsByTenant.get(t) ?? { total: 0, em_ia: 0, bloqueados: 0, ultimo: null };
      cur.total++;
      if (l.human_in_control) cur.bloqueados++;
      else cur.em_ia++;
      if (!cur.ultimo || l.last_activity_at > cur.ultimo) cur.ultimo = l.last_activity_at;
      agentsByTenant.set(t, cur);
    }
    const agentes = Array.from(agentsByTenant.entries()).map(([tenant_id, s]) => ({
      tenant_id,
      nome: "Joana",
      canal: "WhatsApp",
      funcao: "Qualificação de leads",
      total_leads: s.total,
      leads_em_ia: s.em_ia,
      leads_bloqueados_hic: s.bloqueados,
      liberado: s.bloqueados === 0,
      ultima_atividade: s.ultimo,
    }));

    // ── 4. Funil — comercial_leads ─────────────────────────────────────────
    const funilRaw = await pool.query<{
      tenant_id: string; id: string; lead_name: string | null; phone: string;
      pipeline_key: string | null; stage_key: string | null; status: string;
      canal: string | null; origem: string | null; responsavel_nome: string | null;
      created_at: string; helen_card_id: string | null;
    }>(`
      SELECT tenant_id, id, lead_name, phone, pipeline_key, stage_key, status,
             canal, origem, responsavel_nome, created_at, helen_card_id
      FROM comercial_leads
      ${tenantFilter ? "WHERE tenant_id = $1" : "WHERE status = 'aberto'"}
      ORDER BY created_at DESC
      LIMIT 200
    `, tenantFilter ? [tenantFilter] : []);

    // ── 5. Campanhas (growth_campaigns com colunas novas) ─────────────────
    const campRaw = await pool.query<{
      id: string; tenant_id: string; name: string; objective: string | null;
      channel: string | null; source: string | null; angulo: string | null;
      oferta: string | null; status: string; observacoes: string | null; created_at: string;
    }>(`
      SELECT id, tenant_id, name, objective, channel, source, angulo, oferta, status, observacoes, created_at
      FROM growth_campaigns
      ${tenantFilter ? "WHERE tenant_id = $1" : ""}
      ORDER BY created_at DESC
      LIMIT 100
    `, tenantFilter ? [tenantFilter] : []);

    // Vincula leads a campanhas quando origem bate com source da campanha
    const campLeadsMap = new Map<string, { total: number; premium: number; baixo: number }>();
    for (const camp of campRaw.rows) {
      campLeadsMap.set(camp.id, { total: 0, premium: 0, baixo: 0 });
    }
    for (const l of leads) {
      for (const camp of campRaw.rows) {
        if (camp.source && l.segmento && camp.source.toLowerCase() === l.segmento.toLowerCase()) {
          const m = campLeadsMap.get(camp.id)!;
          m.total++;
          if (l.classificacao === "fit_premium_pro") m.premium++;
          if (l.classificacao === "baixo_fit") m.baixo++;
        }
      }
    }

    const campanhas = campRaw.rows.map((c) => ({
      ...c,
      leads_gerados: campLeadsMap.get(c.id)?.total ?? 0,
      leads_premium: campLeadsMap.get(c.id)?.premium ?? 0,
      leads_baixo_fit: campLeadsMap.get(c.id)?.baixo ?? 0,
    }));

    // ── 6. Insights — classificações dos últimos 30d por dia ─────────────
    const insightsRaw = await pool.query<{ day: string; classificacao: string; count: string }>(`
      SELECT
        DATE_TRUNC('day', last_activity_at)::date::text AS day,
        COALESCE(joana_context::jsonb->>'classificacao', 'em_qualificacao') AS classificacao,
        COUNT(*)::text AS count
      FROM lead_conversation_state
      WHERE last_activity_at >= NOW() - INTERVAL '30 days'
        AND joana_context IS NOT NULL
        ${tenantFilter ? "AND tenant_id = $1" : ""}
      GROUP BY day, classificacao
      ORDER BY day ASC
    `, tenantFilter ? [tenantFilter] : []);

    // ── 7. Sumário geral ──────────────────────────────────────────────────
    const totalLeads = leads.length;
    const handoffsAbertos = leads.filter((l) => l.human_in_control).length;
    const leadsEmIA = leads.filter((l) => !l.human_in_control).length;
    const activeCampaigns = campanhas.filter((c) => c.status === "active").length;

    res.json({
      ok: true,
      tenant_filter: tenantFilter,
      overview: {
        total_leads: totalLeads,
        active_campaigns: activeCampaigns,
        handoffs_abertos: handoffsAbertos,
        leads_em_ia: leadsEmIA,
        classificacoes,
        agentes,
      },
      leads,
      funil: funilRaw.rows,
      campanhas,
      insights: {
        classificacoes_por_dia: insightsRaw.rows.map((r) => ({
          day: r.day,
          classificacao: r.classificacao,
          count: Number(r.count),
        })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI Brand Config — GET / PUT por tenant ────────────────────────────────────
// GET /marketing/growth/ai-config?tenant=r2pb
// PUT /marketing/growth/ai-config

router.get("/marketing/growth/ai-config", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const tenant = (req.query.tenant as string | undefined)?.trim();
    if (!tenant) {
      return res.status(400).json({ error: "?tenant= é obrigatório — sem fallback silencioso para nenhum tenant" });
    }
    const { rows } = await pool.query(
      "SELECT * FROM ai_brand_config WHERE tenant_id = $1 LIMIT 1",
      [tenant]
    );
    res.json({ ok: true, config: rows[0] ?? null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/marketing/growth/ai-config", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      tenant_id, brand_name, posicionamento, publico_alvo, segmentos,
      criterios_qualificacao, perguntas_obrigatorias, tom_voz, regras_handoff,
      pode_prometer, nao_pode_prometer, msg_baixo_fit, msg_encaminhamento,
      msg_reposicionamento_preco,
    } = req.body as Record<string, string>;

    if (!tenant_id) return res.status(400).json({ error: "tenant_id obrigatório" });

    await pool.query(`
      INSERT INTO ai_brand_config (
        tenant_id, brand_name, posicionamento, publico_alvo, segmentos,
        criterios_qualificacao, perguntas_obrigatorias, tom_voz, regras_handoff,
        pode_prometer, nao_pode_prometer, msg_baixo_fit, msg_encaminhamento,
        msg_reposicionamento_preco, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        brand_name = EXCLUDED.brand_name,
        posicionamento = EXCLUDED.posicionamento,
        publico_alvo = EXCLUDED.publico_alvo,
        segmentos = EXCLUDED.segmentos,
        criterios_qualificacao = EXCLUDED.criterios_qualificacao,
        perguntas_obrigatorias = EXCLUDED.perguntas_obrigatorias,
        tom_voz = EXCLUDED.tom_voz,
        regras_handoff = EXCLUDED.regras_handoff,
        pode_prometer = EXCLUDED.pode_prometer,
        nao_pode_prometer = EXCLUDED.nao_pode_prometer,
        msg_baixo_fit = EXCLUDED.msg_baixo_fit,
        msg_encaminhamento = EXCLUDED.msg_encaminhamento,
        msg_reposicionamento_preco = EXCLUDED.msg_reposicionamento_preco,
        updated_at = NOW()
    `, [
      tenant_id, brand_name ?? null, posicionamento ?? null, publico_alvo ?? null,
      segmentos ?? null, criterios_qualificacao ?? null, perguntas_obrigatorias ?? null,
      tom_voz ?? null, regras_handoff ?? null, pode_prometer ?? null,
      nao_pode_prometer ?? null, msg_baixo_fit ?? null, msg_encaminhamento ?? null,
      msg_reposicionamento_preco ?? null,
    ]);

    const { rows } = await pool.query("SELECT * FROM ai_brand_config WHERE tenant_id = $1 LIMIT 1", [tenant_id]);
    res.json({ ok: true, config: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Growth Campaign — criar / atualizar campanha com campos completos ──────────
// POST /marketing/growth/campaigns-v2
// ── Auto-geração de criativos após criar campanha ──────────────────────────────
// Dispara em background — não bloqueia a resposta HTTP
async function autoGenerateCampaignPack(campaign: {
  id: string; tenant_id: string; name: string;
  objective: string | null; channel: string | null;
  angulo: string | null; oferta: string | null; observacoes: string | null;
  creative_mode?: string | null;
}): Promise<void> {
  const log = (msg: string, data?: Record<string, unknown>) =>
    console.log(JSON.stringify({ msg: `[AutoGen] ${msg}`, campaignId: campaign.id, ...data }));

  log("Iniciando geração automática de criativos");

  // Contexto de marca por tenant — evita mistura de branding entre tenants
  const TENANT_CONTEXT: Record<string, { persona: string; defaultOferta: string; defaultAngulo: string; defaultObjetivo: string; rules: string }> = {
    "r2pb": {
      persona: "diretor criativo da R2PB, empresa de private label premium para marcas de moda brasileiras",
      defaultOferta: "Parceria private label",
      defaultAngulo: "Marcas que querem escalar com qualidade",
      defaultObjetivo: "Captação de marcas premium",
      rules: `REGRA OBRIGATÓRIA: Se a campanha mencionar fábrica, corte, costura, bordado, estamparia, modelagem, CAD ou autoridade produtiva → pelo menos 1 dos 2 briefs DEVE usar creative_type="autoridade_fabrica" e descrever uma cena de chão de fábrica ou ateliê técnico.
PROIBIDO usar linguagem de comunidade, curadoria ou ecossistema — esse é o contexto da R2PB (fábrica, private label, produção).`,
    },
    "mirage": {
      persona: "diretor criativo do Hub Mirage / Moda Conecta — ecossistema de curadoria, comunidade e inteligência comercial do mercado têxtil brasileiro",
      defaultOferta: "Conexão gratuita com fornecedores verificados",
      defaultAngulo: "Marcas e compradores que querem encontrar os parceiros certos",
      defaultObjetivo: "Captação de marcas e compradores para o Moda Conecta",
      rules: `REGRA OBRIGATÓRIA: Os visuais devem refletir conexão humana, networking, curadoria premium — pessoas em showroom, encontros B2B, tecidos selecionados, ambiente limpo e institucional.
PROIBIDO usar creative_type="autoridade_fabrica" ou imagens de chão de fábrica, maquinário industrial ou produção bruta — esse é o contexto do Mirage (comunidade, curadoria, ecossistema).
Tom: institucional, premium, limpo. Evitar estética de fábrica.`,
    },
  };
  // ── Falha explícita para tenant desconhecido — sem fallback silencioso para r2pb ──
  const tenantCtx = TENANT_CONTEXT[campaign.tenant_id];
  if (!tenantCtx) {
    log("Tenant desconhecido — abortando auto-gen sem fallback", { tenant: campaign.tenant_id });
    return;
  }

  try {
    // 1. Gera 2 briefs criativos com GPT
    // Schema e vocabulário são completamente separados por tenant para evitar contaminação semântica.
    const isMirage = campaign.tenant_id === "mirage";

    // ── Schema Mirage (sem vocabulário R2PB) ───────────────────────────────────
    const MIRAGE_SCHEMA = `{ "briefs": [
  {
    "title": "string — identificador interno do brief",
    "image_prompt": "string — descrição fotográfica concreta em inglês para IA de imagem. Cenários obrigatórios: showroom, networking B2B, flat lay de tecidos selecionados, encontros institucionais, ambiente limpo. Sem texto, sem logo, sem produto fashion genérico.",
    "visual_register": "showroom"|"networking"|"flat_lay"|"institutional"|"editorial",
    "aspect_ratio": "1:1"|"4:5"|"9:16",
    "context_note": "string — contexto da campanha para este visual",
    "caption": "string — legenda completa em português BR, 3-4 frases + 5 hashtags. Tom institucional/editorial. Sem emoji. Foco em ecossistema, curadoria, conexão de mercado.",
    "headline": "string — até 5 palavras em português para o card (NÃO vai na imagem)"
  }
]}`;

    // ── Schema R2PB (vocabulário original) ────────────────────────────────────
    const R2PB_SCHEMA = `{ "briefs": [
  {
    "title": "string — identificador interno",
    "image_prompt": "string — descrição fotográfica concreta em inglês, para IA de imagem. Proibido mencionar marca, texto, logo ou tipografia.",
    "creative_type": "streetwear"|"fitness"|"alfaiataria"|"generico"|"autoridade_fabrica",
    "aspect_ratio": "1:1"|"4:5"|"9:16",
    "context_note": "string",
    "caption": "string — legenda completa do post em português BR, 3-4 frases + 5 hashtags. Tom direto, sem emoji. Foco em dor/solução para o público-alvo.",
    "headline": "string — até 5 palavras em português para o card (NÃO vai na imagem)"
  }
]}`;

    const briefSchema = isMirage ? MIRAGE_SCHEMA : R2PB_SCHEMA;

    const systemPrompt = `Você é o ${tenantCtx.persona}.
Dado o briefing de uma campanha, gere 2 briefs visuais distintos para geração de imagem por IA.
Retorne SOMENTE JSON válido (sem markdown), no formato:
${briefSchema}

${tenantCtx.rules}
Os prompts de imagem NÃO devem mencionar nomes de marca, texto, logo ou tipografia — a imagem deve ser puramente visual.
Varie as linhas visuais entre os 2 briefs.`;

    const userPrompt = `CAMPANHA: ${campaign.name}
OBJETIVO: ${campaign.objective ?? tenantCtx.defaultObjetivo}
CANAL: ${campaign.channel ?? "Instagram"}
OFERTA: ${campaign.oferta ?? tenantCtx.defaultOferta}
ÂNGULO CRIATIVO: ${campaign.angulo ?? tenantCtx.defaultAngulo}
CONTEXTO: ${campaign.observacoes ?? ""}
TENANT: ${campaign.tenant_id}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      max_completion_tokens: 1500,
    });

    const raw = (completion.choices[0]?.message?.content ?? "{}").replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    let parsed: { briefs: { title: string; image_prompt: string; creative_type?: string; visual_register?: string; aspect_ratio: string; context_note: string; caption?: string; headline?: string }[] };
    try { parsed = JSON.parse(raw); } catch {
      log("GPT retornou JSON inválido — abortando auto-gen", { raw: raw.slice(0, 200) });
      return;
    }

    const briefs = Array.isArray(parsed.briefs) ? parsed.briefs.slice(0, 3) : [];
    if (!briefs.length) { log("Nenhum brief gerado — abortando"); return; }
    log(`${briefs.length} briefs gerados — iniciando pipeline de imagem`);

    // 2. Para cada brief, roda o pipeline gerar-imagem
    const { enrichR2PBPrompt, resolveCreativeAxis, resolveSegment } = await import("../../lib/r2pbPromptEnricher");
    const { enrichMiragePrompt, inferMirageCreativeMode } = await import("../../lib/mirageCreativeEngine");

    // Para mirage: resolve modo criativo (body > inferência automática)
    const mirageMode = campaign.tenant_id === "mirage"
      ? ((campaign.creative_mode as any) ?? inferMirageCreativeMode({
          campaignName: campaign.name,
          campaignObjective: campaign.objective,
          angulo: campaign.angulo,
        }))
      : null;

    for (const brief of briefs) {
      try {
        let enrichedPrompt: string;
        let creativeAxis: string;
        let segment: string;
        let creativeType: string;
        let directionApplied: string[];
        let negativeTermsApplied: string[] | undefined;
        let resolvedMode: string | undefined;

        if (campaign.tenant_id === "mirage") {
          // ── Mirage engine — isolamento total de R2PB ────────────────────
          const result = enrichMiragePrompt({
            imagePrompt: brief.image_prompt,
            creativeMode: mirageMode,
            contextNote: brief.context_note ?? null,
            campaignName: campaign.name,
            campaignObjective: campaign.objective ?? undefined,
          });
          enrichedPrompt     = result.enrichedPrompt;
          creativeType       = "generico"; // Mirage nunca usa tipos R2PB
          creativeAxis       = "comunidade_ecossistema";
          segment            = "ecossistema";
          directionApplied   = result.directionApplied;
          negativeTermsApplied = result.negativeTermsApplied;
          resolvedMode       = result.creativeMode;
        } else {
          // ── R2PB engine (comportamento original) ────────────────────────
          const VALID_TYPES = ["streetwear", "fitness", "alfaiataria", "generico", "autoridade_fabrica"];
          const ct = (VALID_TYPES.includes(brief.creative_type) ? brief.creative_type : "generico") as any;
          const result = enrichR2PBPrompt({ imagePrompt: brief.image_prompt, creativeType: ct, contextNote: brief.context_note ?? null });
          enrichedPrompt   = result.enrichedPrompt;
          creativeType     = ct;
          creativeAxis     = resolveCreativeAxis(ct);
          segment          = resolveSegment(ct);
          directionApplied = result.directionApplied;
        }

        // autoridade_fabrica (R2PB only) → gpt-image-2; Mirage sempre usa banana
        const useOpenAI  = creativeType === "autoridade_fabrica";
        const providerName = useOpenAI ? "openai-image" : "banana";
        const dbProvider   = useOpenAI ? "openai" : "banana";

        const [asset] = await db.insert(growthAssets).values({
          tenantId: campaign.tenant_id,
          campaignId: campaign.id,
          assetType: "image",
          provider: dbProvider as any,
          title: brief.title ?? null,
          promptInput: {
            original_prompt: brief.image_prompt,
            enriched_prompt: enrichedPrompt,
            pipeline: campaign.tenant_id === "mirage" ? "mirage-engine" : "r2pb-engine",
            creative_type: creativeType,
            creative_axis: creativeAxis,
            segment,
            aspect_ratio: brief.aspect_ratio ?? "1:1",
            context_note: brief.context_note ?? null,
            direction_applied: directionApplied,
            // Mirage: visual_register do brief (substituiu creative_type)
            ...(brief.visual_register ? { visual_register: brief.visual_register } : {}),
            ...(resolvedMode ? { creative_mode: resolvedMode } : {}),
            ...(negativeTermsApplied ? { negative_terms: negativeTermsApplied } : {}),
            source: "auto-gen",
          },
          status: "requested",
          createdBy: "auto-gen",
        }).returning();

        const [run] = await db.insert(growthProviderRuns).values({
          tenantId: campaign.tenant_id,
          campaignId: campaign.id,
          assetId: asset.id,
          provider: dbProvider as any,
          runType: "generate",
          status: "queued",
          requestPayload: { image_prompt: brief.image_prompt, creative_type: creativeType, provider: providerName },
        }).returning();

        try {
          await db.update(growthProviderRuns).set({ status: "running", updatedAt: new Date() }).where(eq(growthProviderRuns.id, run.id));
          await db.update(growthAssets).set({ status: "generating", updatedAt: new Date() }).where(eq(growthAssets.id, asset.id));

          const t0 = Date.now();
          let result: { outputUrl: string; storagePath: string; mimeType: string; requestPayload: unknown; responsePayload: unknown };
          if (useOpenAI) {
            const { generateOpenAIImage, aspectRatioToOpenAISize } = await import("../../lib/openaiImageProvider");
            result = await generateOpenAIImage({
              prompt: enrichedPrompt,
              tenantId: campaign.tenant_id,
              campaignId: campaign.id,
              size: aspectRatioToOpenAISize(brief.aspect_ratio ?? "1:1"),
            });
          } else {
            const { generateBananaImage } = await import("../../lib/bananaProvider");
            result = await generateBananaImage({ prompt: enrichedPrompt, tenantId: campaign.tenant_id, campaignId: campaign.id });
          }
          const durationMs = Date.now() - t0;

          // Copy PRIMEIRO — headline precisa existir antes de compor a imagem
          const { applyBrandingToStoredImage } = await import("../../lib/growthAssetBranding");
          const { generateR2PBCopy }           = await import("../../lib/r2pbCopyGenerator");

          let finalUrl      = result.outputUrl;
          let compositionOk = false;
          let copyResult: { headline: string; caption: string; cta: string } | null = null;

          // 1. Gera copy (headline + caption + cta) — necessário antes do branding
          try {
            copyResult = await generateR2PBCopy({
              creativeType, creativeAxis, segment,
              contextNote: brief.context_note ?? null,
              title: brief.title ?? null,
              imagePrompt: brief.image_prompt,
              tenantId: campaign.tenant_id,
            });
          } catch (copyErr: any) {
            log(`Copy generation falhou — branding sem headline`, { error: copyErr?.message });
          }

          // caption/headline do brief têm prioridade sobre copy gerado (auto-gen já tem copy do LLM de briefs)
          const captionText  = brief.caption?.trim()  || copyResult?.caption  || null;
          const headlineText = brief.headline?.trim() || copyResult?.headline || null;
          const ctaText      = copyResult?.cta || (captionText ? "Fale com um especialista" : null);

          // 2. Aplica branding COM a headline já disponível
          try {
            finalUrl = await applyBrandingToStoredImage({
              rawStoragePath: result.outputUrl,
              tenantId: campaign.tenant_id,
              campaignId: campaign.id,
              headline: headlineText ?? null,
            });
            compositionOk = true;
          } catch (brandErr: any) {
            log(`Branding falhou — usando imagem base`, { error: brandErr?.message });
          }

          await db.update(growthProviderRuns).set({ status: "success", durationMs, updatedAt: new Date() }).where(eq(growthProviderRuns.id, run.id));
          await db.update(growthAssets).set({
            status: "awaiting_approval",
            outputUrl: finalUrl,
            outputData: result.responsePayload as any,
            generationTimeMs: durationMs,
            caption: captionText,
            headline: headlineText,
            cta: ctaText,
            compositionApplied: compositionOk,
            sourcePipeline: "v2",
            updatedAt: new Date(),
          }).where(eq(growthAssets.id, asset.id));

          log(`Criativo gerado com sucesso`, { assetId: asset.id, title: brief.title, durationMs, branded: compositionOk, hasCaption: !!captionText });
        } catch (genErr: any) {
          const msg = genErr?.message ?? "Erro desconhecido";
          await db.update(growthProviderRuns).set({ status: "failed", errorMessage: msg, updatedAt: new Date() }).where(eq(growthProviderRuns.id, run.id));
          await db.update(growthAssets).set({ status: "failed", errorMessage: msg, updatedAt: new Date() }).where(eq(growthAssets.id, asset.id));
          log(`Falha ao gerar criativo`, { assetId: asset.id, error: msg });
        }
      } catch (briefErr: any) {
        log(`Erro ao processar brief`, { error: briefErr?.message });
      }
    }

    log("Auto-geração concluída", { total: briefs.length });
  } catch (err: any) {
    log("Erro crítico no auto-gen", { error: err?.message });
  }
}

router.post("/marketing/growth/campaigns-v2", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      tenant_id, name, objective, channel, source, angulo, oferta, observacoes,
      nicho, intencao_criativa, estagio_funil, creative_mode,
      status = "active",
    } = req.body as Record<string, string>;
    if (!tenant_id || !name) return res.status(400).json({ error: "tenant_id e name obrigatórios" });

    const { rows } = await pool.query<{ id: string }>(`
      INSERT INTO growth_campaigns (tenant_id, name, objective, channel, source, angulo, oferta, observacoes, nicho, intencao_criativa, estagio_funil, creative_mode, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id
    `, [tenant_id, name, objective ?? null, channel ?? null, source ?? null, angulo ?? null, oferta ?? null, observacoes ?? null, nicho ?? null, intencao_criativa ?? null, estagio_funil ?? null, creative_mode ?? null, status]);

    const campaignId = rows[0].id;

    // Dispara auto-geração em background sem bloquear resposta
    setImmediate(() => {
      autoGenerateCampaignPack({
        id: campaignId, tenant_id, name,
        objective: objective ?? null, channel: channel ?? null,
        angulo: angulo ?? null, oferta: oferta ?? null, observacoes: observacoes ?? null,
        creative_mode: creative_mode ?? null,
      }).catch(() => {});
    });

    res.json({ ok: true, id: campaignId, auto_generating: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /marketing/growth/campaigns-v2/:id
router.patch("/marketing/growth/campaigns-v2/:id", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name, objective, channel, source, angulo, oferta, observacoes, nicho, intencao_criativa, estagio_funil, status } = req.body as Record<string, string>;

    await pool.query(`
      UPDATE growth_campaigns SET
        name = COALESCE($2, name),
        objective = COALESCE($3, objective),
        channel = COALESCE($4, channel),
        source = COALESCE($5, source),
        angulo = COALESCE($6, angulo),
        oferta = COALESCE($7, oferta),
        observacoes = COALESCE($8, observacoes),
        nicho = COALESCE($9, nicho),
        intencao_criativa = COALESCE($10, intencao_criativa),
        estagio_funil = COALESCE($11, estagio_funil),
        status = COALESCE($12, status),
        updated_at = NOW()
      WHERE id = $1
    `, [id, name ?? null, objective ?? null, channel ?? null, source ?? null, angulo ?? null, oferta ?? null, observacoes ?? null, nicho ?? null, intencao_criativa ?? null, estagio_funil ?? null, status ?? null]);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Prompt Settings — GET / PUT por tenant ────────────────────────────────────
// GET /marketing/growth/prompt-settings?tenant=r2pb
router.get("/marketing/growth/prompt-settings", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const tenant = (req.query.tenant as string | undefined)?.trim();
    if (!tenant) {
      return res.status(400).json({ error: "?tenant= é obrigatório — sem fallback silencioso para nenhum tenant" });
    }
    const { rows } = await pool.query(
      "SELECT * FROM marketing_prompt_settings WHERE tenant_id = $1 LIMIT 1",
      [tenant]
    );
    res.json({ ok: true, settings: rows[0] ?? null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /marketing/growth/prompt-settings
router.put("/marketing/growth/prompt-settings", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      tenant_id, image_prompt_master, video_prompt_master, negative_prompt,
      feed_prompt_modifier, story_prompt_modifier, reel_prompt_modifier,
      authority_prompt_block, process_prompt_block, lifestyle_prompt_block, product_prompt_block,
      color_direction, casting_direction, scenario_direction, active,
      // Texto na Imagem
      text_overlay_required,
      image_headline_primary, image_headline_variations, image_text_style_instruction,
      feed_text_overlay_instruction, story_text_overlay_instruction, reel_text_overlay_instruction,
      // Chamada do Post / Legenda
      post_caption_cta_primary, post_caption_cta_variations,
      post_caption_tone, post_caption_structure, post_caption_instruction_master,
      // Variação de legenda por formato
      feed_caption_modifier, story_caption_modifier, reel_caption_modifier,
    } = req.body as Record<string, string | boolean | undefined>;

    if (!tenant_id) return res.status(400).json({ error: "tenant_id obrigatório" });

    await pool.query(`
      INSERT INTO marketing_prompt_settings (
        tenant_id, image_prompt_master, video_prompt_master, negative_prompt,
        feed_prompt_modifier, story_prompt_modifier, reel_prompt_modifier,
        authority_prompt_block, process_prompt_block, lifestyle_prompt_block, product_prompt_block,
        color_direction, casting_direction, scenario_direction, active,
        text_overlay_required,
        image_headline_primary, image_headline_variations, image_text_style_instruction,
        feed_text_overlay_instruction, story_text_overlay_instruction, reel_text_overlay_instruction,
        post_caption_cta_primary, post_caption_cta_variations,
        post_caption_tone, post_caption_structure, post_caption_instruction_master,
        feed_caption_modifier, story_caption_modifier, reel_caption_modifier,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        image_prompt_master   = EXCLUDED.image_prompt_master,
        video_prompt_master   = EXCLUDED.video_prompt_master,
        negative_prompt       = EXCLUDED.negative_prompt,
        feed_prompt_modifier  = EXCLUDED.feed_prompt_modifier,
        story_prompt_modifier = EXCLUDED.story_prompt_modifier,
        reel_prompt_modifier  = EXCLUDED.reel_prompt_modifier,
        authority_prompt_block  = EXCLUDED.authority_prompt_block,
        process_prompt_block    = EXCLUDED.process_prompt_block,
        lifestyle_prompt_block  = EXCLUDED.lifestyle_prompt_block,
        product_prompt_block    = EXCLUDED.product_prompt_block,
        color_direction       = EXCLUDED.color_direction,
        casting_direction     = EXCLUDED.casting_direction,
        scenario_direction    = EXCLUDED.scenario_direction,
        active                = EXCLUDED.active,
        text_overlay_required            = EXCLUDED.text_overlay_required,
        image_headline_primary           = EXCLUDED.image_headline_primary,
        image_headline_variations        = EXCLUDED.image_headline_variations,
        image_text_style_instruction     = EXCLUDED.image_text_style_instruction,
        feed_text_overlay_instruction    = EXCLUDED.feed_text_overlay_instruction,
        story_text_overlay_instruction   = EXCLUDED.story_text_overlay_instruction,
        reel_text_overlay_instruction    = EXCLUDED.reel_text_overlay_instruction,
        post_caption_cta_primary         = EXCLUDED.post_caption_cta_primary,
        post_caption_cta_variations      = EXCLUDED.post_caption_cta_variations,
        post_caption_tone                = EXCLUDED.post_caption_tone,
        post_caption_structure           = EXCLUDED.post_caption_structure,
        post_caption_instruction_master  = EXCLUDED.post_caption_instruction_master,
        feed_caption_modifier            = EXCLUDED.feed_caption_modifier,
        story_caption_modifier           = EXCLUDED.story_caption_modifier,
        reel_caption_modifier            = EXCLUDED.reel_caption_modifier,
        updated_at            = NOW()
    `, [
      tenant_id,
      image_prompt_master ?? null, video_prompt_master ?? null, negative_prompt ?? null,
      feed_prompt_modifier ?? null, story_prompt_modifier ?? null, reel_prompt_modifier ?? null,
      authority_prompt_block ?? null, process_prompt_block ?? null,
      lifestyle_prompt_block ?? null, product_prompt_block ?? null,
      color_direction ?? null, casting_direction ?? null, scenario_direction ?? null,
      active !== false,
      text_overlay_required !== false,
      image_headline_primary ?? null, image_headline_variations ?? null, image_text_style_instruction ?? null,
      feed_text_overlay_instruction ?? null, story_text_overlay_instruction ?? null, reel_text_overlay_instruction ?? null,
      post_caption_cta_primary ?? null, post_caption_cta_variations ?? null,
      post_caption_tone ?? null, post_caption_structure ?? null, post_caption_instruction_master ?? null,
      feed_caption_modifier ?? null, story_caption_modifier ?? null, reel_caption_modifier ?? null,
    ]);

    const { rows } = await pool.query("SELECT * FROM marketing_prompt_settings WHERE tenant_id = $1 LIMIT 1", [tenant_id]);
    res.json({ ok: true, settings: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /marketing/growth/campaigns-v2/:id — apaga campanha + slots + assets
router.delete("/marketing/growth/campaigns-v2/:id", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    // Verificar se existe antes de apagar
    const check = await pool.query("SELECT id FROM growth_campaigns WHERE id = $1::uuid LIMIT 1", [id]);
    if (!check.rows.length) return res.status(404).json({ error: "Campanha não encontrada" });

    // Apaga slots (podem referenciar assets via asset_id)
    await pool.query("DELETE FROM growth_campaign_slots WHERE campaign_id = $1::uuid", [id]);
    // Zerar auto-referência antes de apagar assets (parent_asset_id auto-ref)
    await pool.query("UPDATE growth_assets SET parent_asset_id = NULL WHERE campaign_id = $1::uuid", [id]);
    // Apaga assets
    await pool.query("DELETE FROM growth_assets WHERE campaign_id = $1::uuid", [id]);
    // Apaga runs
    await pool.query("DELETE FROM growth_provider_runs WHERE campaign_id = $1::uuid", [id]);
    // Apaga campanha
    await pool.query("DELETE FROM growth_campaigns WHERE id = $1::uuid", [id]);

    logger.info({ campaignId: id }, "growth campaign deleted");
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ campaignId: id, err: err.message }, "Erro ao deletar campanha");
    res.status(500).json({ error: err.message });
  }
});

// ── SLOTS DE CAMPANHA ─────────────────────────────────────────────────────────
// Arquitetura: formato nasce na campanha, não depois da geração.
// Cada slot representa uma vaga planejada (feed/story/reel) com status próprio.

// GET /marketing/growth/campaigns-v2/:id/slots — lista slots com asset embutido
router.get("/marketing/growth/campaigns-v2/:id/slots", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params as { id: string };
  try {
    const slots = await db.select().from(growthCampaignSlots)
      .where(eq(growthCampaignSlots.campaignId, id))
      .orderBy(asc(growthCampaignSlots.slotType), asc(growthCampaignSlots.slotIndex));

    // Buscar assets vinculados em batch
    const assetIds = slots.map(s => s.assetId).filter(Boolean) as string[];
    const assets = assetIds.length > 0
      ? await db.select().from(growthAssets).where(inArray(growthAssets.id, assetIds))
      : [];
    const assetMap = Object.fromEntries(assets.map(a => [a.id, a]));

    const result = slots.map(s => ({
      ...s,
      asset: s.assetId ? (assetMap[s.assetId] ?? null) : null,
    }));

    res.json({ ok: true, slots: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /marketing/growth/campaigns-v2/:id/slots/create-from-quota
// Cria slots a partir de cotas de formato definidas na campanha.
// Body: { feed_count, story_count, reel_count, creative_axis?, segment?, objective?, planned_date? }
router.post("/marketing/growth/campaigns-v2/:id/slots/create-from-quota", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { id: campaignId } = req.params as { id: string };
  const {
    feed_count = 0, story_count = 0, reel_count = 0,
    creative_axis, segment, objective, planned_date,
  } = req.body as {
    feed_count?: number; story_count?: number; reel_count?: number;
    creative_axis?: string; segment?: string; objective?: string; planned_date?: string;
  };

  const [campaign] = await db.select().from(growthCampaigns).where(eq(growthCampaigns.id, campaignId)).limit(1);
  if (!campaign) return res.status(404).json({ error: "Campanha não encontrada" });

  const toCreate: Array<typeof growthCampaignSlots.$inferInsert> = [];
  const types: Array<{ type: string; count: number }> = [
    { type: "feed",  count: Number(feed_count)  },
    { type: "story", count: Number(story_count) },
    { type: "reel",  count: Number(reel_count)  },
  ];

  for (const { type, count } of types) {
    for (let i = 1; i <= count; i++) {
      toCreate.push({
        tenantId:     campaign.tenantId,
        campaignId,
        slotType:     type,
        slotIndex:    i,
        plannedDate:  planned_date ?? null,
        creativeAxis: creative_axis ?? null,
        segment:      segment ?? null,
        objective:    objective ?? null,
        isExtra:      false,
        status:       "pending_generation",
      });
    }
  }

  if (toCreate.length === 0) return res.status(400).json({ error: "Informe ao menos 1 slot (feed_count, story_count ou reel_count)" });

  // Pré-atribuir arquétipos criativos para cada slot antes de inserir
  const { assignArchetypes } = await import("../../lib/creativeArchetypes");
  const archetypes = assignArchetypes(toCreate.map(s => ({ slotType: s.slotType as string, slotIndex: s.slotIndex ?? 1 })));
  toCreate.forEach((s, i) => { (s as any).creative_archetype = archetypes[i]; });

  const created = await db.insert(growthCampaignSlots).values(toCreate).returning();

  // Salvar cotas no meta da campanha para referência futura
  await pool.query(
    `UPDATE growth_campaigns SET meta = COALESCE(meta,'{}')::jsonb || $2::jsonb, updated_at = NOW() WHERE id = $1`,
    [campaignId, JSON.stringify({ feed_quota: feed_count, story_quota: story_count, reel_quota: reel_count })],
  );

  req.log.info({ campaignId, total: created.length }, "slots/create-from-quota: slots criados");
  res.status(201).json({ ok: true, slots: created, total: created.length });
});

// POST /marketing/growth/slots/:slotId/sync-video — verifica status do job HeyGen de um slot reel
router.post("/marketing/growth/slots/:slotId/sync-video", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { slotId } = req.params as { slotId: string };
  try {
    const [slot] = await db.select().from(growthCampaignSlots).where(eq(growthCampaignSlots.id, slotId)).limit(1);
    if (!slot) return res.status(404).json({ error: "Slot não encontrado" });
    if (!slot.assetId) return res.status(422).json({ error: "Slot sem asset vinculado" });

    // Busca o provider run mais recente do HeyGen para este asset
    const { growthProviderRuns } = await import("@workspace/db");
    const { desc: descOrd } = await import("drizzle-orm");
    const [run] = await db.select().from(growthProviderRuns)
      .where(eq(growthProviderRuns.assetId, slot.assetId))
      .orderBy(descOrd(growthProviderRuns.createdAt))
      .limit(1);

    if (!run?.externalJobId) return res.status(422).json({ error: "Nenhum job HeyGen encontrado para este slot" });

    const { getHeygenVideoJob } = await import("../../lib/heygenProvider");
    const jobStatus = await getHeygenVideoJob(run.externalJobId);

    if (jobStatus.status === "success" && jobStatus.outputUrl) {
      await db.update(growthAssets).set({ status: "awaiting_approval" as any, outputUrl: jobStatus.outputUrl, updatedAt: new Date() }).where(eq(growthAssets.id, slot.assetId));
      await db.update(growthCampaignSlots).set({ status: "generated" as const, updatedAt: new Date() }).where(eq(growthCampaignSlots.id, slotId));
      return res.json({ ok: true, status: "generated", video_url: jobStatus.outputUrl });
    } else if (jobStatus.status === "failed") {
      await db.update(growthAssets).set({ status: "pending_video" as any, updatedAt: new Date() }).where(eq(growthAssets.id, slot.assetId));
      await db.update(growthCampaignSlots).set({ status: "pending_video" as any, updatedAt: new Date() }).where(eq(growthCampaignSlots.id, slotId));
      return res.json({ ok: false, status: "failed", error: jobStatus.errorMessage });
    } else {
      return res.json({ ok: true, status: "generating", message: "Vídeo ainda em processamento no HeyGen (~90s total)" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /marketing/growth/slots/:slotId/generate-video — dispara HeyGen para slot pending_video
router.post("/marketing/growth/slots/:slotId/generate-video", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { slotId } = req.params as { slotId: string };
  try {
    const [slot] = await db.select().from(growthCampaignSlots).where(eq(growthCampaignSlots.id, slotId)).limit(1);
    if (!slot) return res.status(404).json({ error: "Slot não encontrado" });
    if (slot.slotType !== "reel") return res.status(422).json({ error: "Apenas slots do tipo reel usam pipeline de vídeo" });
    if (!["pending_video", "pending_generation"].includes(slot.status)) {
      return res.status(422).json({ error: `Slot em status ${slot.status} — não pode gerar vídeo agora` });
    }

    // Busca roteiro do asset existente ou usa context_note do body
    const { script: bodyScript } = req.body as Record<string, string | undefined>;
    let roteiro = bodyScript ?? null;

    if (!roteiro && slot.assetId) {
      const [existingAsset] = await db.select().from(growthAssets).where(eq(growthAssets.id, slot.assetId)).limit(1);
      roteiro = (existingAsset?.promptInput as any)?.roteiro ?? existingAsset?.caption ?? null;
    }

    if (!roteiro) return res.status(422).json({ error: "Roteiro não encontrado — passe 'script' no body" });

    // Cria/atualiza asset e dispara HeyGen
    const [campaign] = await db.select().from(growthCampaigns).where(eq(growthCampaigns.id, slot.campaignId)).limit(1);
    const { createHeygenVideoJob } = await import("../../lib/heygenProvider");
    const { growthProviderRuns } = await import("@workspace/db");

    let assetId = slot.assetId;
    if (!assetId) {
      const [asset] = await db.insert(growthAssets).values({
        tenantId: slot.tenantId, campaignId: slot.campaignId, assetType: "video", provider: "heygen",
        title: campaign?.name ?? null, promptInput: { roteiro, slot_type: "reel" }, status: "generating" as any, caption: roteiro, createdBy: "manual",
      }).returning();
      assetId = asset.id;
      await db.update(growthCampaignSlots).set({ assetId, updatedAt: new Date() }).where(eq(growthCampaignSlots.id, slotId));
    } else {
      await db.update(growthAssets).set({ status: "generating" as any, updatedAt: new Date() }).where(eq(growthAssets.id, assetId));
    }

    await db.update(growthCampaignSlots).set({ status: "generating" as const, updatedAt: new Date() }).where(eq(growthCampaignSlots.id, slotId));

    const [run] = await db.insert(growthProviderRuns).values({
      tenantId: slot.tenantId, campaignId: slot.campaignId, assetId, provider: "heygen", runType: "generate", status: "queued",
      requestPayload: { script: roteiro, aspect_ratio: "9:16" },
    }).returning();

    // Responde imediatamente, dispara em background
    res.json({ ok: true, asset_id: assetId, message: "Job HeyGen criado — use sync-video para verificar quando concluir (~90s)" });

    (async () => {
      try {
        await db.update(growthProviderRuns).set({ status: "running", updatedAt: new Date() }).where(eq(growthProviderRuns.id, run.id));
        const { externalJobId, requestPayload, responsePayload } = await createHeygenVideoJob({ title: campaign?.name, script: roteiro!, aspectRatio: "9:16" });
        await db.update(growthProviderRuns).set({ status: "success", externalJobId, requestPayload, responsePayload, updatedAt: new Date() }).where(eq(growthProviderRuns.id, run.id));
        req.log.info({ slotId, assetId, externalJobId }, "generate-video: HeyGen job criado ✅");
      } catch (e: any) {
        await db.update(growthProviderRuns).set({ status: "failed", errorMessage: e.message, updatedAt: new Date() }).where(eq(growthProviderRuns.id, run.id));
        await db.update(growthAssets).set({ status: "pending_video" as any, updatedAt: new Date() }).where(eq(growthAssets.id, assetId!));
        await db.update(growthCampaignSlots).set({ status: "pending_video" as any, updatedAt: new Date() }).where(eq(growthCampaignSlots.id, slotId));
      }
    })().catch(() => {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /marketing/pilotos/slots/:slotId/generate — gera criativo para um slot específico
router.post("/marketing/pilotos/slots/:slotId/generate", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { slotId } = req.params as { slotId: string };
  const { image_prompt, context_note, provider: providerInput } = req.body as Record<string, string | undefined>;

  const [slot] = await db.select().from(growthCampaignSlots).where(eq(growthCampaignSlots.id, slotId)).limit(1);
  if (!slot) return res.status(404).json({ error: "Slot não encontrado" });

  // Permite retry se slot ficou travado em "generating" (pipeline morreu sem cleanup)
  if (!["pending_generation", "rejected", "generating"].includes(slot.status)) {
    return res.status(422).json({ error: `Slot em status ${slot.status} — não pode gerar agora` });
  }
  // image_prompt is now OPTIONAL — the system builds it from slot + campaign automatically

  const [campaign] = await db.select().from(growthCampaigns).where(eq(growthCampaigns.id, slot.campaignId)).limit(1);

  // Buscar brand blueprint do tenant para enriquecer o contexto de geração
  const tenantSlugForBrand = await getTenantSlug(slot.tenantId);
  const [brandRow] = tenantSlugForBrand
    ? await db.select().from(brandBlueprints).where(eq(brandBlueprints.companySlug, tenantSlugForBrand)).limit(1)
    : [undefined];
  const brandCtx = brandRow
    ? [
        brandRow.nomeMarca    && `Marca: ${brandRow.nomeMarca}`,
        brandRow.tomDeVoz     && `Tom de voz: ${brandRow.tomDeVoz}`,
        brandRow.estiloVisual && `Estilo visual: ${brandRow.estiloVisual}`,
        brandRow.promessa     && `Promessa da marca: ${brandRow.promessa}`,
        (brandRow as any).corPrimaria && `Cor primária: ${(brandRow as any).corPrimaria}`,
      ].filter(Boolean).join(". ")
    : null;

  // Buscar cenas recentes para anti-repetição
  const recentAssets = await db.select({ promptInput: growthAssets.promptInput })
    .from(growthAssets)
    .where(and(eq(growthAssets.campaignId, slot.campaignId), eq(growthAssets.tenantId, slot.tenantId)))
    .orderBy(desc(growthAssets.createdAt))
    .limit(5);
  const recentSceneLabels = recentAssets
    .map(a => (a.promptInput as any)?.direction_applied ?? [])
    .flat()
    .filter((d: string) => d.startsWith("cena:"))
    .map((d: string) => d.replace("cena:", ""));

  // ── Arquétipo criativo do slot ────────────────────────────────────────────────
  const slotArchetype = (slot as any).creative_archetype as string | null ?? null;

  // ── Hipótese do slot — enriquece o prompt com intenção criativa específica ──
  const slotHypothesis = {
    hypothesis_angle: (slot as any).hypothesis_angle ?? null,
    target_context:   (slot as any).target_context   ?? null,
    pain_point:       (slot as any).pain_point        ?? null,
    promise:          (slot as any).promise            ?? null,
    creative_style:   (slot as any).creative_style    ?? null,
    hook_type:        (slot as any).hook_type          ?? null,
    cta_type:         (slot as any).cta_type           ?? null,
    usage_type:       (slot as any).usage_type         ?? "organic",
  };

  // ── Contexto de campanha para o prompt ───────────────────────────────────────
  const campaignContext = [
    campaign?.angulo    && `Ângulo criativo: ${campaign.angulo}`,
    campaign?.oferta    && `Oferta: ${campaign.oferta}`,
    campaign?.objective && campaign.objective,
    brandCtx,
  ].filter(Boolean).join(". ") || null;

  // Buscar configuração de prompt do tenant (Prompt Studio)
  let promptSettings: Record<string, string | null> | null = null;
  try {
    const { rows: psRows } = await pool.query(
      "SELECT * FROM marketing_prompt_settings WHERE tenant_id = $1 AND active = true LIMIT 1",
      [slot.tenantId]
    );
    if (psRows.length > 0) promptSettings = psRows[0];
  } catch { /* tabela pode não existir ainda — ignora */ }

  // ════════════════════════════════════════════════════════════════════════════
  // BRANCH POR TENANT — isolamento total de R2PB vs Mirage
  // ════════════════════════════════════════════════════════════════════════════

  const isMirageTenant = slot.tenantId === "mirage";

  let finalEnrichedPrompt: string;
  let detectedType: string;
  let enrichedAxis: string;
  let enrichedSegment: string;
  let directionApplied: string[];
  let mirageMode: string | undefined;
  let negativeTermsApplied: string[] | undefined;

  if (isMirageTenant) {
    // ── MIRAGE ENGINE — zero vocabulário R2PB ─────────────────────────────────
    const { enrichMiragePrompt, inferMirageCreativeMode } = await import("../../lib/mirageCreativeEngine");

    // Prompt base: campo manual > auto-construído com contexto de comunidade
    const providedPrompt = image_prompt?.trim();
    const basePrompt = (providedPrompt && providedPrompt.length >= 5)
      ? providedPrompt
      : [
          `${slot.slotType === "story" ? "Vertical editorial frame" : "Square editorial frame"}.`,
          `Context: ${campaignContext ?? "Moda Conecta B2B ecosystem, fashion market, curated connections"}`,
          `Format: ${slot.slotType}, ${slot.segment ?? "fashion industry professionals"}`,
        ].join(" ");

    const resolvedMode = (campaign as any)?.creative_mode ?? inferMirageCreativeMode({
      campaignName: campaign?.name,
      campaignObjective: campaign?.objective,
      angulo: campaign?.angulo,
    });

    const refino = context_note?.trim();
    const imagePromptToEnrich = refino ? `${basePrompt}. ${refino}` : basePrompt;

    const mirageResult = enrichMiragePrompt({
      imagePrompt: imagePromptToEnrich,
      creativeMode: resolvedMode as any,
      contextNote: campaignContext,
      slotType: slot.slotType as any,
      campaignName: campaign?.name,
      campaignObjective: campaign?.objective,
    });

    finalEnrichedPrompt  = mirageResult.enrichedPrompt;
    detectedType         = "generico"; // Mirage nunca usa tipos R2PB
    enrichedAxis         = "comunidade_ecossistema";
    enrichedSegment      = "ecossistema";
    directionApplied     = mirageResult.directionApplied;
    negativeTermsApplied = mirageResult.negativeTermsApplied;
    mirageMode           = mirageResult.creativeMode;

  } else {
    // ── R2PB ENGINE — comportamento original ──────────────────────────────────
    const { enrichR2PBPrompt, buildSlotPrompt, detectCreativeTypeFromContext } = await import("../../lib/r2pbPromptEnricher");
    const VALID_TYPES = ["streetwear", "fitness", "alfaiataria", "generico", "autoridade_fabrica"];

    const rawAxis = slot.creativeAxis ?? (slot.slotType === "story" ? "lifestyle_nicho" : "autoridade_fabrica");

    let resolvedCreativeType: string;
    if (rawAxis === "autoridade_fabrica") {
      resolvedCreativeType = "autoridade_fabrica";
    } else if (VALID_TYPES.includes(rawAxis)) {
      resolvedCreativeType = rawAxis;
    } else {
      const nichoText = [(campaign as any)?.nicho, (campaign as any)?.angulo, (campaign as any)?.intencao_criativa]
        .filter(Boolean).join(" ").toLowerCase();
      const hasFitness     = nichoText.includes("fitness") || nichoText.includes("academia");
      const hasAlfaiataria = nichoText.includes("alfaiataria") || nichoText.includes("executivo") || nichoText.includes("social");
      const rotation: string[] = ["streetwear"];
      if (hasFitness)     rotation.push("fitness");
      if (hasAlfaiataria) rotation.push("alfaiataria");
      const slotIdx = (slot.slotIndex ?? 1) - 1;
      resolvedCreativeType = rotation[slotIdx % rotation.length];
    }

    const providedPrompt = image_prompt?.trim();
    const slotBasePrompt = (providedPrompt && providedPrompt.length >= 5)
      ? providedPrompt
      : buildSlotPrompt(slot.slotType as any, rawAxis, campaign, slotHypothesis, slotArchetype);
    const refino = context_note?.trim();
    const finalImagePrompt = refino ? `${slotBasePrompt}. Ajuste: ${refino}` : slotBasePrompt;

    detectedType = detectCreativeTypeFromContext(`${finalImagePrompt} ${slot.segment ?? ""}`, resolvedCreativeType as any);

    const enriched = enrichR2PBPrompt({
      imagePrompt: finalImagePrompt,
      creativeType: detectedType,
      contextNote: campaignContext,
      slotType: slot.slotType as any,
      recentSceneLabels,
      archetype: slotArchetype,
    });

    enrichedAxis    = enriched.creativeAxis;
    enrichedSegment = enriched.segment;
    directionApplied = enriched.directionApplied;

    // Aplicar Prompt Studio
    finalEnrichedPrompt = enriched.enrichedPrompt;
    if (promptSettings) {
      const ps = promptSettings;
      const overlayParts: string[] = [];
      if (ps.image_prompt_master?.trim()) overlayParts.push(`DIREÇÃO DE ARTE — INSTRUÇÃO OPERACIONAL:\n${ps.image_prompt_master.trim()}`);
      const formatMod = slot.slotType === "feed" ? ps.feed_prompt_modifier
        : slot.slotType === "story" ? ps.story_prompt_modifier
        : ps.reel_prompt_modifier;
      if (formatMod?.trim()) overlayParts.push(`DIREÇÃO DE FORMATO:\n${formatMod.trim()}`);
      if (enriched.creativeAxis === "autoridade_fabrica") {
        if (ps.authority_prompt_block?.trim()) overlayParts.push(`DIREÇÃO DE AUTORIDADE:\n${ps.authority_prompt_block.trim()}`);
        if (ps.process_prompt_block?.trim())   overlayParts.push(`DIREÇÃO DE PROCESSO:\n${ps.process_prompt_block.trim()}`);
      } else {
        if (ps.lifestyle_prompt_block?.trim()) overlayParts.push(`DIREÇÃO DE LIFESTYLE:\n${ps.lifestyle_prompt_block.trim()}`);
      }
      if (ps.product_prompt_block?.trim()) overlayParts.push(`DIREÇÃO DE PRODUTO:\n${ps.product_prompt_block.trim()}`);
      const visualParts: string[] = [];
      if (ps.color_direction?.trim())    visualParts.push(`Cores: ${ps.color_direction.trim()}`);
      if (ps.casting_direction?.trim())  visualParts.push(`Modelos/casting: ${ps.casting_direction.trim()}`);
      if (ps.scenario_direction?.trim()) visualParts.push(`Cenários: ${ps.scenario_direction.trim()}`);
      if (visualParts.length) overlayParts.push(`DIREÇÃO VISUAL:\n${visualParts.join("\n")}`);
      if (ps.negative_prompt?.trim()) overlayParts.push(`PROIBIÇÕES ADICIONAIS:\n${ps.negative_prompt.trim()}`);
      if (overlayParts.length) finalEnrichedPrompt = `${enriched.enrichedPrompt}\n\n---\n\n${overlayParts.join("\n\n---\n\n")}`;
    }
  }

  // Lifestyle types (streetwear/fitness/alfaiataria/generico) usam OpenAI também — qualidade superior
  const useOpenAI = providerInput === "openai-image" || true;
  const dbProvider = useOpenAI ? "openai" : "banana";
  const tenantId = slot.tenantId;

  // Marcar slot como gerando
  await db.update(growthCampaignSlots).set({ status: "generating", updatedAt: new Date() }).where(eq(growthCampaignSlots.id, slotId));

  const [asset] = await db.insert(growthAssets).values({
    tenantId,
    campaignId: slot.campaignId,
    assetType: "image",
    provider: dbProvider as any,
    title: `${slot.slotType.toUpperCase()} ${slot.slotIndex} — ${campaign?.name ?? "Campanha"}`,
    promptInput: {
      original_prompt: image_prompt ?? campaignContext ?? "auto",
      enriched_prompt: finalEnrichedPrompt,
      pipeline: isMirageTenant ? "mirage-engine" : "r2pb-engine",
      prompt_studio_applied: promptSettings !== null,
      creative_type: detectedType,
      creative_axis: enrichedAxis,
      segment: enrichedSegment,
      aspect_ratio: slot.slotType === "feed" ? "4:5" : "9:16",
      context_note: context_note ?? null,
      direction_applied: directionApplied,
      ...(mirageMode ? { creative_mode: mirageMode } : {}),
      ...(negativeTermsApplied ? { negative_terms: negativeTermsApplied } : {}),
      slot_id: slotId,
      slot_type: slot.slotType,
      creative_archetype: slotArchetype,
      source: "slot-generate",
    },
    publishDestination: slot.slotType,
    status: "requested",
    createdBy: "hub-slot",
  }).returning();

  // Vincular asset ao slot imediatamente
  await db.update(growthCampaignSlots).set({ assetId: asset.id, updatedAt: new Date() }).where(eq(growthCampaignSlots.id, slotId));

  // Gerar imagem de forma assíncrona (fire & forget)
  (async () => {
    const [run] = await db.insert(growthProviderRuns).values({
      tenantId, campaignId: slot.campaignId, assetId: asset.id,
      provider: dbProvider as any, runType: "generate", status: "queued",
      requestPayload: { image_prompt, creative_type: detectedType, slot_type: slot.slotType },
    }).returning();

    try {
      await db.update(growthProviderRuns).set({ status: "running", updatedAt: new Date() }).where(eq(growthProviderRuns.id, run.id));
      await db.update(growthAssets).set({ status: "generating", updatedAt: new Date() }).where(eq(growthAssets.id, asset.id));

      const t0 = Date.now();
      let result: { outputUrl: string; storagePath: string; mimeType: string; requestPayload: unknown; responsePayload: unknown };
      if (useOpenAI) {
        const { generateOpenAIImage, aspectRatioToOpenAISize } = await import("../../lib/openaiImageProvider");
        result = await generateOpenAIImage({ prompt: finalEnrichedPrompt, tenantId, campaignId: slot.campaignId, size: aspectRatioToOpenAISize(slot.slotType === "feed" ? "4:5" : "9:16") });
      } else {
        const { generateBananaImage } = await import("../../lib/bananaProvider");
        result = await generateBananaImage({ prompt: finalEnrichedPrompt, tenantId, campaignId: slot.campaignId });
      }
      const durationMs = Date.now() - t0;

      const { applyBrandingToStoredImage } = await import("../../lib/growthAssetBranding");

      let finalUrl = result.outputUrl;
      let compositionOk = false;
      let copyResult: { headline: string; caption: string; cta: string } | null = null;

      // Copy FIRST — headline must exist before branding composes it onto the image
      try {
        if (isMirageTenant) {
          // ── Mirage copy — zero vocabulário R2PB ─────────────────────────────
          const { generateMirageCopy } = await import("../../lib/mirageCreativeEngine");
          const ps = promptSettings;
          copyResult = await generateMirageCopy({
            creativeMode: (mirageMode ?? "institucional") as any,
            imagePrompt: finalEnrichedPrompt,
            contextNote: context_note ?? campaignContext,
            campaignName: campaign?.name,
            slotType: slot.slotType as "feed" | "story" | "reel",
            postCaptionCtaPrimary:        ps?.post_caption_cta_primary ?? null,
            postCaptionTone:              ps?.post_caption_tone ?? null,
            postCaptionInstructionMaster: ps?.post_caption_instruction_master ?? null,
            imageHeadlinePrimary:         ps?.image_headline_primary ?? null,
            imageHeadlineVariations:      ps?.image_headline_variations ?? null,
          });
          req.log.info({ slotId, tenantId, headline: copyResult.headline }, "slot-generate: mirage copy gerada");
        } else {
          // ── R2PB copy — comportamento original ──────────────────────────────
          const { generateR2PBCopy } = await import("../../lib/r2pbCopyGenerator");
          const ps = promptSettings;
          copyResult = await generateR2PBCopy({
            creativeType: detectedType, creativeAxis: enrichedAxis,
            segment: enrichedSegment, contextNote: context_note ?? null,
            title: null, imagePrompt: image_prompt ?? "", tenantId,
            creativeArchetype: slotArchetype,
            slotType: slot.slotType as "feed" | "story" | "reel",
            imageHeadlinePrimary:          ps?.image_headline_primary ?? null,
            imageHeadlineVariations:       ps?.image_headline_variations ?? null,
            imageTextStyleInstruction:     ps?.image_text_style_instruction ?? null,
            feedTextOverlayInstruction:    ps?.feed_text_overlay_instruction ?? null,
            storyTextOverlayInstruction:   ps?.story_text_overlay_instruction ?? null,
            reelTextOverlayInstruction:    ps?.reel_text_overlay_instruction ?? null,
            postCaptionCtaPrimary:         ps?.post_caption_cta_primary ?? null,
            postCaptionCtaVariations:      ps?.post_caption_cta_variations ?? null,
            postCaptionTone:               ps?.post_caption_tone ?? null,
            postCaptionStructure:          ps?.post_caption_structure ?? null,
            postCaptionInstructionMaster:  ps?.post_caption_instruction_master ?? null,
            feedCaptionModifier:           ps?.feed_caption_modifier ?? null,
            storyCaptionModifier:          ps?.story_caption_modifier ?? null,
            reelCaptionModifier:           ps?.reel_caption_modifier ?? null,
          });
        }
      } catch (copyErr: any) {
        req.log.error({ slotId, tenantId, err: copyErr?.message }, "slot-generate: copy generation FALHOU — imagem sem headline/caption");
      }

      try {
        finalUrl = await applyBrandingToStoredImage({
          rawStoragePath: result.outputUrl,
          tenantId,
          campaignId: slot.campaignId,
          headline: copyResult?.headline ?? null,
          slotType: slot.slotType as "feed" | "story" | "reel",
        });
        compositionOk = true;
      } catch (brandErr: any) {
        req.log.error({ slotId, tenantId, err: brandErr?.message }, "slot-generate: branding FALHOU — usando imagem base");
      }

      await db.update(growthProviderRuns).set({ status: "success", durationMs, updatedAt: new Date() }).where(eq(growthProviderRuns.id, run.id));
      await db.update(growthAssets).set({
        status: "awaiting_approval", outputUrl: finalUrl, generationTimeMs: durationMs,
        compositionApplied: compositionOk, sourcePipeline: "v2",
        headline: copyResult?.headline ?? null, caption: copyResult?.caption ?? null, cta: copyResult?.cta ?? null,
        updatedAt: new Date(),
      }).where(eq(growthAssets.id, asset.id));
      await db.update(growthCampaignSlots).set({ status: "generated", updatedAt: new Date() }).where(eq(growthCampaignSlots.id, slotId));
    } catch (err: any) {
      await db.update(growthProviderRuns).set({ status: "failed", errorMessage: err.message, updatedAt: new Date() }).where(eq(growthProviderRuns.id, run.id));
      await db.update(growthAssets).set({ status: "failed", errorMessage: err.message, updatedAt: new Date() }).where(eq(growthAssets.id, asset.id));
      await db.update(growthCampaignSlots).set({ status: "pending_generation", updatedAt: new Date() }).where(eq(growthCampaignSlots.id, slotId));
    }
  })();

  res.status(202).json({ ok: true, assetId: asset.id, slotId, message: "Geração iniciada — verifique status em breve" });
});

// POST /marketing/pilotos/slots/:slotId/regenerate — regenera criativo no mesmo slot
// O slot mantém tipo, data planejada e objetivo; o criativo antigo vai para rejected.
router.post("/marketing/pilotos/slots/:slotId/regenerate", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { slotId } = req.params as { slotId: string };
  const { image_prompt, context_note, new_direction } = req.body as {
    image_prompt?: string; context_note?: string; new_direction?: string;
  };

  const [slot] = await db.select().from(growthCampaignSlots).where(eq(growthCampaignSlots.id, slotId)).limit(1);
  if (!slot) return res.status(404).json({ error: "Slot não encontrado" });

  // Rejeitar o asset atual se houver
  if (slot.assetId) {
    await db.update(growthAssets).set({ status: "rejected", updatedAt: new Date() }).where(eq(growthAssets.id, slot.assetId));
  }

  // Resetar slot para pending_generation com referência à regeneração anterior
  await db.update(growthCampaignSlots).set({
    status: "pending_generation",
    regenerationOf: slot.assetId ?? slot.regenerationOf,
    assetId: null,
    updatedAt: new Date(),
  }).where(eq(growthCampaignSlots.id, slotId));

  // Delegar geração via endpoint interno — sem image_prompt (sistema auto-constrói a partir do slot)
  const contextToUse = context_note ?? new_direction ?? null;

  // Chamar a lógica de generate internamente
  const genReq = { ...req, body: { context_note: contextToUse }, params: { slotId } } as any;
  const genRes = {
    status: (code: number) => ({ json: (body: any) => res.status(code).json({ ...body, regenerated: true }) }),
    json: (body: any) => res.json({ ...body, regenerated: true }),
  } as any;

  // Forward para o handler de generate
  const generateHandler = router.stack.find(l => l.route?.path === "/marketing/pilotos/slots/:slotId/generate");
  if (generateHandler) {
    return generateHandler.route.stack[generateHandler.route.stack.length - 1].handle(genReq, genRes, () => {});
  }

  // Fallback: retorna ok e instrui o cliente a chamar generate
  res.json({ ok: true, slotId, message: "Slot resetado — chame /generate para gerar novo criativo", regenerated: true });
});

// ── Growth: criar criativo de tela real (screenshot → Growth campaign+slot+asset) ──

router.post("/marketing/growth/product-screenshot-campaign", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const schema = z.object({
      tenant_id:       z.string().default("mirage"),
      module:          z.string().default("kanban"),
      screenshot_file: z.string().optional(), // relativo a /home/runner/workspace/screenshots/
    });
    const { tenant_id: tenantId, module: moduleName, screenshot_file } = schema.parse(req.body);

    const { readFile } = await import("fs/promises");
    const { existsSync } = await import("fs");
    const { randomUUID } = await import("crypto");

    // 1. Screenshot do disco
    const screenshotPath = screenshot_file
      ? `/home/runner/workspace/screenshots/${screenshot_file}`
      : `/home/runner/workspace/screenshots/kanban-preview-creative.jpg`;
    if (!existsSync(screenshotPath)) {
      return res.status(422).json({ error: `Screenshot não encontrada: ${screenshotPath}` });
    }
    const imageBuffer = await readFile(screenshotPath);

    // 2. Upload para GCS
    const privateDir = process.env["PRIVATE_OBJECT_DIR"] ?? "";
    const clean      = privateDir.startsWith("/") ? privateDir.slice(1) : privateDir;
    const slashIdx   = clean.indexOf("/");
    const bucketName = slashIdx >= 0 ? clean.slice(0, slashIdx) : clean;
    const dirInBucket = slashIdx >= 0 ? clean.slice(slashIdx + 1) : "";
    if (!bucketName) return res.status(500).json({ error: "PRIVATE_OBJECT_DIR não configurado" });

    const uuid       = randomUUID();
    const assetPath  = `growth-assets/${tenantId}/product-screenshots/${uuid}.jpg`;
    const objectName = dirInBucket ? `${dirInBucket}/${assetPath}` : assetPath;
    const bucket     = objectStorageClient.bucket(bucketName);
    await bucket.file(objectName).save(imageBuffer, { contentType: "image/jpeg", resumable: false });
    const outputUrl = `/objects/${assetPath}`;

    // 3. Gerar copy com OpenAI
    const MODULE_CONTEXT: Record<string, string> = {
      kanban:     "Kanban de Produção — controle visual das 14 fases da confecção, ordens de produção, prazos e CMO em tempo real.",
      plm:        "PLM (Product Lifecycle Management) — ficha técnica, BOM, modelagem e aprovação de coleção.",
      crm:        "CRM Comercial — funil de leads, automação de follow-up e relatórios de conversão.",
      financeiro: "Módulo Financeiro — fluxo de caixa, contas a pagar/receber e Open Banking Stone.",
      erp:        "ERP Mirage (VhSys) — emissão de NF-e, PDV, controle de estoque e gestão financeira integrada.",
    };
    const context = MODULE_CONTEXT[moduleName] ?? `Módulo ${moduleName} do Mirage Hub`;

    const copyCompletion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `Você é copywriter especialista em SaaS B2B para o setor de moda/confecção brasileiro.
Escreva copy para Instagram da Mirage Hub (plataforma de gestão para confecções).
Retorne JSON com: { "headline": "...", "caption": "..." }
- headline: até 10 palavras, impactante, focado no resultado
- caption: 3-4 frases curtas, termina com CTA claro e 4-5 hashtags relevantes
- Tom: direto, profissional, orientado a resultado operacional
- Idioma: Português brasileiro`,
        },
        {
          role: "user",
          content: `Crie copy para post mostrando a tela real do sistema:\n${context}\nFoco: produtividade, controle e integração com o Hub Mirage.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const copyJson = JSON.parse(copyCompletion.choices[0]?.message?.content ?? "{}");
    const headline = String(copyJson.headline ?? `${moduleName} — Mirage Hub`);
    const caption  = String(copyJson.caption  ?? `Gerencie sua confecção com o Mirage Hub.`);

    // 4. Criar campanha Growth (raw SQL para suportar colunas de migrate.ts)
    const campName = `${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} — Telas Reais`;
    const campRows = await pool.query<{ id: string }>(
      `INSERT INTO growth_campaigns (tenant_id, name, objective, channel, source, creative_mode, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [tenantId, campName, context, "instagram", "product_screenshot", "product_screenshot", "active"]
    );
    const campaignId = campRows.rows[0]!.id;

    // 5. Criar slot
    const slotRows = await pool.query<{ id: string }>(
      `INSERT INTO growth_campaign_slots (tenant_id, campaign_id, slot_type, slot_index, creative_axis, status)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [tenantId, campaignId, "feed", 1, `Tela real — ${moduleName}`, "pending_generation"]
    );
    const slotId = slotRows.rows[0]!.id;

    // 6. Criar growth_asset
    const assetRows = await pool.query<{ id: string }>(
      `INSERT INTO growth_assets
         (tenant_id, campaign_id, asset_type, provider, title, output_url, headline, caption, status, source_pipeline, prompt_input)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [
        tenantId, campaignId, "image", "manual",
        `${campName} — Tela real`,
        outputUrl, headline, caption,
        "awaiting_approval", "product_screenshot",
        JSON.stringify({ module: moduleName, screenshot_file: screenshotPath, source: "hub_real_screen" }),
      ]
    );
    const assetId = assetRows.rows[0]!.id;

    // 7. Vincular asset ao slot
    await pool.query(
      `UPDATE growth_campaign_slots SET asset_id = $1, status = 'generated' WHERE id = $2`,
      [assetId, slotId]
    );

    req.log.info({ tenantId, campaignId, slotId, assetId }, "product-screenshot-campaign: criado ✅");
    res.json({ ok: true, campaign_id: campaignId, slot_id: slotId, asset_id: assetId, output_url: outputUrl, headline, caption });
  } catch (err: any) {
    req.log.error({ err: err.message }, "product-screenshot-campaign: erro");
    res.status(500).json({ error: err.message });
  }
});

export default router;
