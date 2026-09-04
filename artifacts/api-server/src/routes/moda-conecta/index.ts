import { Router, type IRouter } from "express";
import { db, mentorSettings } from "@workspace/db";
import { modaConectaLeads } from "@workspace/db";
import { eq, desc, ilike, or, and, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import {
  requireAuth,
  requireSuperAdmin,
  type AuthenticatedRequest,
} from "../../middlewares/auth";

const router: IRouter = Router();

const VALID_STATUSES = ["novo", "em_revisao", "incompleto", "aprovado", "rejeitado", "convite_enviado"] as const;

// ─── POST /api/moda-conecta/lp-capture ───────────────────────
// Captura rápida do mini-form da LP externa (WordPress/Elementor)
// Aceita qualquer nome de campo, salva lead parcial e redireciona para o formulário completo
router.options("/moda-conecta/lp-capture", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(204);
});

router.post("/moda-conecta/lp-capture", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const REDIRECT_URL = "https://www.gestaomirage.com.br/moda-conecta/fundadores";

  // Aceita qualquer variação de nome de campo que builders usam
  const body = req.body ?? {};
  const fullName: string = (
    body.fullName ?? body.full_name ?? body.nome ?? body.name ?? body["seu-nome"] ?? body["SEU NOME"] ?? ""
  ).toString().trim();

  const rawContact: string = (
    body.email ?? body.whatsapp ?? body.phone ?? body.contato ??
    body["whatsapp-ou-email"] ?? body["WHATSAPP OU E-MAIL"] ?? ""
  ).toString().trim();

  const isEmail = rawContact.includes("@");
  const email = isEmail ? rawContact : `lp+${Date.now()}@modaconecta.temp`;
  const whatsapp = !isEmail ? rawContact : undefined;

  const utmSource  = (body.utm_source  ?? req.query.utm_source  ?? "lp-modaconecta").toString();
  const utmMedium  = (body.utm_medium  ?? req.query.utm_medium  ?? "lp-form").toString();
  const utmCampaign = (body.utm_campaign ?? req.query.utm_campaign ?? "moda-conecta-lp").toString();

  try {
    if (fullName.length >= 2) {
      const existing = await db
        .select({ id: modaConectaLeads.id })
        .from(modaConectaLeads)
        .where(and(
          eq(modaConectaLeads.email, email.toLowerCase()),
          eq(modaConectaLeads.companySlug, "mirage"),
        ))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(modaConectaLeads).values({
          companySlug: "mirage",
          fullName,
          email: email.toLowerCase(),
          whatsapp: whatsapp ?? null,
          lgpdConsent: true,
          lgpdConsentAt: new Date(),
          campaignSource: utmCampaign,
          utmSource,
          utmMedium,
          utmCampaign,
          status: "novo",
        });
      }
    }
  } catch (_) {
    // Falha silenciosa — não bloqueia o redirect
  }

  // Se o builder espera JSON (webhook), retorna redirect URL
  const acceptJson = (req.headers["accept"] ?? "").includes("application/json") ||
                     (req.headers["content-type"] ?? "").includes("application/json");

  if (acceptJson) {
    res.json({ ok: true, redirect: REDIRECT_URL });
  } else {
    res.redirect(302, REDIRECT_URL);
  }
});

// ─── POST /api/moda-conecta/leads/public ─────────────────────
// Endpoint público — sem autenticação
router.post("/moda-conecta/leads/public", async (req, res) => {
  const {
    fullName, email, phone, whatsapp, companyName, city, state,
    cep, neighborhood, addressLine,
    instagram, website, roleInChain, specialties, productionCapacity,
    mainNeed, mainOffer, photoUrls, lgpdConsent,
    campaignSource, utmSource, utmMedium, utmCampaign,
    companySlug = "mirage",
  } = req.body;

  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
    res.status(400).json({ error: "Nome completo é obrigatório" }); return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "E-mail inválido" }); return;
  }
  if (!lgpdConsent) {
    res.status(400).json({ error: "Consentimento LGPD é obrigatório" }); return;
  }

  const existingCheck = await db
    .select({ id: modaConectaLeads.id })
    .from(modaConectaLeads)
    .where(and(
      eq(modaConectaLeads.email, email.toLowerCase().trim()),
      eq(modaConectaLeads.companySlug, companySlug),
    ))
    .limit(1);

  if (existingCheck.length > 0) {
    res.status(409).json({ ok: false, error: "Este e-mail já está cadastrado na lista de espera.", alreadyExists: true });
    return;
  }

  const [row] = await db.insert(modaConectaLeads).values({
    companySlug,
    campaignSource: campaignSource ?? utmCampaign ?? null,
    fullName: fullName.trim(),
    email: email.toLowerCase().trim(),
    phone: phone ?? null,
    whatsapp: whatsapp ?? null,
    companyName: companyName ?? null,
    city: city ?? null,
    state: state ?? null,
    cep: cep ?? null,
    neighborhood: neighborhood ?? null,
    addressLine: addressLine ?? null,
    instagram: instagram ?? null,
    website: website ?? null,
    roleInChain: roleInChain ?? null,
    specialties: specialties ?? null,
    productionCapacity: productionCapacity ?? null,
    mainNeed: mainNeed ?? null,
    mainOffer: mainOffer ?? null,
    photoUrls: Array.isArray(photoUrls) && photoUrls.length > 0 ? photoUrls : null,
    utmSource: utmSource ?? null,
    utmMedium: utmMedium ?? null,
    utmCampaign: utmCampaign ?? null,
    lgpdConsent: Boolean(lgpdConsent),
    lgpdConsentAt: new Date(),
    status: "novo",
  }).returning();

  res.status(201).json({ ok: true, leadId: row.id, status: "novo" });

  // ── Alerta n8n — disparo assíncrono, não bloqueia o endpoint ──
  const log = req.log;
  setImmediate(async () => {
    try {
      const [wh] = await db
        .select({ value: mentorSettings.value })
        .from(mentorSettings)
        .where(eq(mentorSettings.key, "n8n_moda_conecta_lead_webhook"))
        .limit(1);
      if (!wh?.value) return;
      const resp = await fetch(wh.value, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "moda_conecta_new_lead",
          leadId: row.id,
          fullName: row.fullName,
          email: row.email,
          whatsapp: row.whatsapp,
          companyName: row.companyName,
          roleInChain: row.roleInChain,
          city: row.city,
          state: row.state,
          status: "novo",
          createdAt: row.createdAt,
        }),
      });
      log.info({ leadId: row.id, status: resp.status }, "moda-conecta: webhook n8n disparado");
    } catch (err) {
      log.warn({ err }, "moda-conecta: webhook n8n falhou (não bloqueou cadastro)");
    }
  });
});

// ─── GET /api/moda-conecta/leads/by-token/:token ─────────────
// Endpoint público — valida token de convite e retorna dados do lead para pré-preenchimento
router.get("/moda-conecta/leads/by-token/:token", async (req, res) => {
  const { token } = req.params;
  if (!token || token.length < 10) {
    res.status(400).json({ error: "Token inválido" }); return;
  }
  const [lead] = await db
    .select({
      id:           modaConectaLeads.id,
      fullName:     modaConectaLeads.fullName,
      email:        modaConectaLeads.email,
      whatsapp:     modaConectaLeads.whatsapp,
      companyName:  modaConectaLeads.companyName,
      city:         modaConectaLeads.city,
      state:        modaConectaLeads.state,
      cep:          modaConectaLeads.cep,
      neighborhood: modaConectaLeads.neighborhood,
      addressLine:  modaConectaLeads.addressLine,
      roleInChain:  modaConectaLeads.roleInChain,
      specialties:  modaConectaLeads.specialties,
      status:       modaConectaLeads.status,
    })
    .from(modaConectaLeads)
    .where(eq(modaConectaLeads.inviteToken, token))
    .limit(1);

  if (!lead) {
    res.status(404).json({ error: "Convite não encontrado" }); return;
  }
  if (lead.status !== "aprovado" && lead.status !== "convite_enviado") {
    res.status(403).json({ error: "Este convite não está ativo" }); return;
  }
  res.json(lead);
});

// ─── GET /api/moda-conecta/leads ─────────────────────────────
router.get("/moda-conecta/leads", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { status, search, companySlug = "mirage", limit = "200", campaignSource } = req.query as Record<string, string>;

  let query = db.select().from(modaConectaLeads).$dynamic();

  const conditions = [eq(modaConectaLeads.companySlug, companySlug)];
  if (status && VALID_STATUSES.includes(status as any)) {
    conditions.push(eq(modaConectaLeads.status, status));
  }
  if (campaignSource) {
    conditions.push(eq(modaConectaLeads.campaignSource, campaignSource));
  }
  if (search) {
    conditions.push(or(
      ilike(modaConectaLeads.fullName, `%${search}%`),
      ilike(modaConectaLeads.email, `%${search}%`),
      ilike(modaConectaLeads.companyName, `%${search}%`),
    )!);
  }

  const rows = await query
    .where(and(...conditions))
    .orderBy(desc(modaConectaLeads.createdAt))
    .limit(Math.min(parseInt(limit, 10) || 200, 500));

  res.json(rows);
});

// ─── GET /api/moda-conecta/leads/stats ───────────────────────
router.get("/moda-conecta/leads/stats", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { companySlug = "mirage" } = req.query as Record<string, string>;

  const rows = await db
    .select({ status: modaConectaLeads.status, count: sql<number>`count(*)::int` })
    .from(modaConectaLeads)
    .where(eq(modaConectaLeads.companySlug, companySlug))
    .groupBy(modaConectaLeads.status);

  const stats: Record<string, number> = { total: 0, novo: 0, em_revisao: 0, incompleto: 0, aprovado: 0, rejeitado: 0, convite_enviado: 0 };
  rows.forEach(r => {
    stats[r.status] = r.count;
    stats.total += r.count;
  });
  res.json(stats);
});

// ─── GET /api/moda-conecta/leads/:id ─────────────────────────
router.get("/moda-conecta/leads/:id", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const [row] = await db.select().from(modaConectaLeads).where(eq(modaConectaLeads.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Lead não encontrado" }); return; }
  res.json(row);
});

// ─── PATCH /api/moda-conecta/leads/:id ───────────────────────
router.patch("/moda-conecta/leads/:id", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const {
    status, reviewNotes, reviewedBy, isContacted,
    fullName, phone, whatsapp, companyName, city, state,
    cep, neighborhood, addressLine,
    instagram, website,
    roleInChain, specialties, productionCapacity, mainNeed, mainOffer, photoUrls,
  } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: `Status inválido. Aceitos: ${VALID_STATUSES.join(", ")}` }); return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (status !== undefined) {
    updates.status = status;
    if (status === "aprovado" || status === "em_revisao" || status === "incompleto" || status === "rejeitado") {
      updates.reviewedAt = new Date();
      updates.reviewedBy = req.user?.email ?? "admin";
    }
    if (status === "aprovado") updates.approvedAt = new Date();
  }
  if (reviewNotes !== undefined) updates.reviewNotes = reviewNotes;
  if (reviewedBy  !== undefined) updates.reviewedBy  = reviewedBy;
  if (isContacted !== undefined) {
    updates.isContacted = Boolean(isContacted);
    if (isContacted) updates.contactedAt = new Date();
  }
  if (fullName  !== undefined) updates.fullName  = fullName;
  if (phone     !== undefined) updates.phone     = phone;
  if (whatsapp  !== undefined) updates.whatsapp  = whatsapp;
  if (companyName !== undefined) updates.companyName = companyName;
  if (city         !== undefined) updates.city         = city;
  if (state        !== undefined) updates.state        = state;
  if (cep          !== undefined) updates.cep          = cep;
  if (neighborhood !== undefined) updates.neighborhood = neighborhood;
  if (addressLine  !== undefined) updates.addressLine  = addressLine;
  if (instagram    !== undefined) updates.instagram    = instagram;
  if (website   !== undefined) updates.website   = website;
  if (roleInChain !== undefined) updates.roleInChain = roleInChain;
  if (specialties !== undefined) updates.specialties = specialties;
  if (productionCapacity !== undefined) updates.productionCapacity = productionCapacity;
  if (mainNeed   !== undefined) updates.mainNeed   = mainNeed;
  if (mainOffer  !== undefined) updates.mainOffer  = mainOffer;
  if (photoUrls  !== undefined) updates.photoUrls  = photoUrls;

  const [row] = await db.update(modaConectaLeads)
    .set(updates)
    .where(eq(modaConectaLeads.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Lead não encontrado" }); return; }
  res.json(row);
});

// ─── POST /api/moda-conecta/leads/:id/invite ─────────────────
router.post("/moda-conecta/leads/:id/invite", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const [lead] = await db.select().from(modaConectaLeads).where(eq(modaConectaLeads.id, id)).limit(1);
  if (!lead) { res.status(404).json({ error: "Lead não encontrado" }); return; }
  if (lead.status !== "aprovado" && lead.status !== "convite_enviado") {
    res.status(400).json({ error: "Lead precisa estar aprovado para receber convite" }); return;
  }

  const token = randomBytes(32).toString("hex");
  const [updated] = await db.update(modaConectaLeads)
    .set({
      inviteToken: token,
      inviteSentAt: new Date(),
      status: "convite_enviado",
      updatedAt: new Date(),
    })
    .where(eq(modaConectaLeads.id, id))
    .returning();

  const hubDomain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "miragehub.app";
  const inviteLink = `https://${hubDomain}/moda-conecta/convite?token=${token}`;

  // Enviar WhatsApp automaticamente (fire-and-forget — não bloqueia a resposta)
  if (lead.whatsapp) {
    const selfUrl = `http://localhost:${process.env.PORT ?? 8080}`;
    const internalKey = process.env.MARKETING_INTERNAL_API_KEY ?? "";
    const phone = lead.whatsapp.replace(/[\s\-+()]/g, "");
    const firstName = lead.fullName?.split(" ")[0] ?? lead.fullName ?? "Olá";
    const msg = `Olá, ${firstName}! 🎉\n\nSeu pré-cadastro no *Moda Conecta* foi aprovado.\n\nClique no link abaixo para completar seu perfil e entrar no diretório:\n${inviteLink}`;
    fetch(`${selfUrl}/api/internal/zapi/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": internalKey },
      body: JSON.stringify({ company_slug: "mirage", phone, message: msg, route_type: "moda-conecta-invite" }),
    }).catch((err: Error) => console.error("[Moda Conecta] WhatsApp invite falhou:", err.message));
  }

  res.json({
    ok: true,
    inviteToken: token,
    inviteLink,
    inviteSentAt: updated.inviteSentAt,
    email: lead.email,
    fullName: lead.fullName,
    whatsappSent: !!lead.whatsapp,
  });
});

export default router;
