import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  comunidadeProfiles,
  comunidadeEspecialidades,
  comunidadeSupplierSpecialties,
  comunidadeSupplierPhotos,
  comunidadeReviews,
  comunidadePreCadastros,
  modaConectaLeads,
  formTokens,
} from "@workspace/db";
import { eq, and, ilike, or, desc, asc, sql, inArray } from "drizzle-orm";
import {
  requireAuth,
  requireSuperAdmin,
  type AuthenticatedRequest,
} from "../../middlewares/auth";
import { supabaseAdmin } from "../../lib/supabase";

const router: IRouter = Router();

// ─── FORM TOKEN (short-link permanente para formulário de lead) ───────────────
router.post("/comunidade/form-token", requireAuth, async (req, res) => {
  const { randomBytes } = await import("crypto");
  const token = randomBytes(4).toString("base64url").slice(0, 6);
  const params = req.body?.params;
  if (!params || typeof params !== "object") {
    res.status(400).json({ error: "params obrigatório" }); return;
  }
  await db.insert(formTokens).values({ token, params }).onConflictDoNothing();
  res.json({ token });
});

// Public: chamado pelo browser do lead — sem auth
router.get("/comunidade/form-token/:token", async (req, res) => {
  const [row] = await db.select().from(formTokens).where(eq(formTokens.token, req.params.token)).limit(1);
  if (!row) { res.status(404).json({ error: "token não encontrado" }); return; }
  res.json({ params: row.params });
});

// ─── STATUS ───────────────────────────────────────────────────
router.get("/comunidade/status", requireAuth, (_req, res) => {
  res.json({ conectado: true, nativo: true, modulos: ["fornecedores", "especialidades", "avaliacoes", "admin", "pre-cadastro"] });
});

// ─── ESPECIALIDADES ───────────────────────────────────────────
router.get("/comunidade/especialidades", requireAuth, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.userTenantIds?.[0];
  if (!tenantId) { res.status(403).json({ error: "Tenant não identificado" }); return; }

  const rows = await db
    .select()
    .from(comunidadeEspecialidades)
    .where(and(eq(comunidadeEspecialidades.tenantId, tenantId), eq(comunidadeEspecialidades.ativo, true)))
    .orderBy(asc(comunidadeEspecialidades.level), asc(comunidadeEspecialidades.displayOrder));

  const byId: Record<string, any> = {};
  rows.forEach(r => { byId[r.id] = { ...r, children: [] }; });
  const tree: any[] = [];
  rows.forEach(r => {
    if (r.parentId && byId[r.parentId]) byId[r.parentId].children.push(byId[r.id]);
    else tree.push(byId[r.id]);
  });

  res.json(tree);
});

router.post("/comunidade/especialidades", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.userTenantIds?.[0];
  if (!tenantId) { res.status(403).json({ error: "Tenant não identificado" }); return; }
  const { parentId, code, name, level, displayOrder } = req.body;
  if (!code || !name || !level) { res.status(400).json({ error: "code, name e level são obrigatórios" }); return; }

  const [row] = await db.insert(comunidadeEspecialidades).values({
    tenantId, parentId: parentId || null, code, name,
    level: Number(level), displayOrder: Number(displayOrder ?? 0),
  }).returning();
  res.status(201).json(row);
});

router.patch("/comunidade/especialidades/:id", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { name, displayOrder, ativo } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (displayOrder !== undefined) updates.displayOrder = Number(displayOrder);
  if (ativo !== undefined) updates.ativo = Boolean(ativo);
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nenhum campo para atualizar" }); return; }
  const id0 = req.params.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [row] = await (db.update(comunidadeEspecialidades) as any)
    .set(updates)
    .where(sql`id = ${id0}`)
    .returning();
  res.json(row);
});

// ─── MEU PERFIL NA COMUNIDADE ─────────────────────────────────
router.get("/comunidade/meu-perfil", requireAuth, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.userTenantIds?.[0];
  const userId = req.user!.id;
  if (!tenantId) { res.status(403).json({ error: "Tenant não identificado" }); return; }

  const [profile] = await db.select().from(comunidadeProfiles)
    .where(and(eq(comunidadeProfiles.tenantId, tenantId), eq(comunidadeProfiles.userId, userId)));

  if (!profile) { res.json(null); return; }

  const [specialties, photos] = await Promise.all([
    db.select({
      id: comunidadeSupplierSpecialties.id,
      specialtyId: comunidadeSupplierSpecialties.specialtyId,
      observations: comunidadeSupplierSpecialties.observations,
      name: comunidadeEspecialidades.name,
      level: comunidadeEspecialidades.level,
      code: comunidadeEspecialidades.code,
    })
      .from(comunidadeSupplierSpecialties)
      .leftJoin(comunidadeEspecialidades, eq(comunidadeSupplierSpecialties.specialtyId, comunidadeEspecialidades.id))
      .where(eq(comunidadeSupplierSpecialties.profileId, profile.id)),

    db.select().from(comunidadeSupplierPhotos)
      .where(eq(comunidadeSupplierPhotos.profileId, profile.id))
      .orderBy(asc(comunidadeSupplierPhotos.displayOrder)),
  ]);

  res.json({ ...profile, specialties, photos });
});

router.post("/comunidade/meu-perfil", requireAuth, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.userTenantIds?.[0];
  const userId = req.user!.id;
  if (!tenantId) { res.status(403).json({ error: "Tenant não identificado" }); return; }

  const {
    userType, profileType, professionalTitle, areaOfExpertise, bio,
    profilePhoto, coverPhoto, cep, endereco, numero, complemento, bairro, cidade, estado,
    latitude, longitude, serviceTypes, productionCapacity, fabricTypes, equipments,
    certifications, averageDeliveryDays, minimumOrderValue, serviceRegion, isPrivateLabel,
    businessType, businessSegment, averageOrderVolume, orderFrequency, servicesNeeded,
    specialtyIds, photoUrls,
  } = req.body;

  const [existing] = await db.select({ id: comunidadeProfiles.id })
    .from(comunidadeProfiles)
    .where(and(eq(comunidadeProfiles.tenantId, tenantId), eq(comunidadeProfiles.userId, userId)));

  // Geocodificar CEP se lat/lng não foram enviados
  let resolvedLat = latitude ?? null;
  let resolvedLng = longitude ?? null;
  if ((!resolvedLat || !resolvedLng) && cep) {
    const cleanCep = String(cep).replace(/\D/g, "");
    if (cleanCep.length === 8) {
      try {
        const geoRes = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
        if (geoRes.ok) {
          const geoData = await geoRes.json() as { latitude?: number; longitude?: number };
          if (geoData.latitude && geoData.longitude) {
            resolvedLat = String(geoData.latitude);
            resolvedLng = String(geoData.longitude);
          }
        }
      } catch { /* ignora — lat/lng continua null */ }
    }
  }

  const profileData: any = {
    tenantId, userId, userType: userType ?? "cliente",
    profileType, professionalTitle, areaOfExpertise, bio,
    profilePhoto, coverPhoto, cep, endereco, numero, complemento, bairro, cidade, estado,
    latitude: resolvedLat, longitude: resolvedLng,
    serviceTypes: serviceTypes ?? null,
    productionCapacity,
    fabricTypes: fabricTypes ?? null,
    equipments, certifications, averageDeliveryDays, minimumOrderValue, serviceRegion,
    isPrivateLabel: isPrivateLabel ?? false,
    businessType,
    businessSegment: businessSegment ?? null,
    averageOrderVolume, orderFrequency,
    servicesNeeded: servicesNeeded ?? null,
    onboardingCompleted: true,
    updatedAt: new Date(),
  };

  let profileId: string;
  if (existing) {
    await db.update(comunidadeProfiles).set(profileData).where(eq(comunidadeProfiles.id, existing.id));
    profileId = existing.id;
  } else {
    const [created] = await db.insert(comunidadeProfiles).values({ ...profileData, approvalStatus: "pendente" })
      .returning({ id: comunidadeProfiles.id });
    profileId = created.id;
  }

  if (Array.isArray(specialtyIds) && specialtyIds.length > 0) {
    await db.delete(comunidadeSupplierSpecialties).where(eq(comunidadeSupplierSpecialties.profileId, profileId));
    await db.insert(comunidadeSupplierSpecialties).values(
      specialtyIds.map((sid: string) => ({ profileId, specialtyId: sid }))
    );
  }

  if (Array.isArray(photoUrls) && photoUrls.length > 0) {
    await db.delete(comunidadeSupplierPhotos).where(eq(comunidadeSupplierPhotos.profileId, profileId));
    await db.insert(comunidadeSupplierPhotos).values(
      photoUrls.map((url: string, i: number) => ({ profileId, photoUrl: url, photoType: "trabalho", displayOrder: i }))
    );
  }

  const [profile] = await db.select().from(comunidadeProfiles).where(eq(comunidadeProfiles.id, profileId));
  res.status(existing ? 200 : 201).json(profile);
});

// ─── CONSTANTES ───────────────────────────────────────────────
const R2PB_TENANT = '093a253e-9c1c-43f5-b988-a50df952d0cd';

// ─── LOCALIDADES — AUTOCOMPLETE ───────────────────────────────
// DEVE vir ANTES de /:id para não ser capturado como ID
router.get("/comunidade/fornecedores/localidades", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.userTenantIds?.[0] ?? R2PB_TENANT;
  const q = ((req.query.q as string) || '').trim();

  const baseConditions: any[] = [
    eq(comunidadeProfiles.tenantId, tenantId),
    eq(comunidadeProfiles.userType, 'fornecedor'),
    eq(comunidadeProfiles.approvalStatus, 'aprovado'),
    eq(comunidadeProfiles.ativo, true),
  ];

  if (q) {
    baseConditions.push(
      or(
        ilike(comunidadeProfiles.cidade, `%${q}%`),
        ilike(comunidadeProfiles.bairro, `%${q}%`),
        ilike(comunidadeProfiles.estado, `%${q}%`),
      )
    );
  }

  const rows = await db
    .selectDistinct({
      cidade: comunidadeProfiles.cidade,
      bairro: comunidadeProfiles.bairro,
      estado: comunidadeProfiles.estado,
      latitude: comunidadeProfiles.latitude,
      longitude: comunidadeProfiles.longitude,
    })
    .from(comunidadeProfiles)
    .where(and(...baseConditions))
    .limit(20);

  const seen = new Set<string>();
  const suggestions: { label: string; cidade: string | null; bairro: string | null; estado: string | null; lat: string | null; lng: string | null }[] = [];

  for (const r of rows) {
    if (!r.cidade && !r.bairro && !r.estado) continue;
    const parts: string[] = [];
    if (r.bairro) parts.push(r.bairro);
    if (r.cidade) parts.push(r.cidade);
    if (r.estado) parts.push(r.estado);
    const label = parts.join(', ');
    if (!seen.has(label)) {
      seen.add(label);
      suggestions.push({ label, cidade: r.cidade, bairro: r.bairro, estado: r.estado, lat: r.latitude, lng: r.longitude });
    }
  }

  res.json(suggestions);
});

// ─── FORNECEDORES — LISTAGEM ──────────────────────────────────
router.get("/comunidade/fornecedores", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.userTenantIds?.[0] ?? R2PB_TENANT;

  const {
    busca,
    minRating,
    capacidade,
    privateLabel,
    somenteVerificados,
    somenteRecomendados,
    localidade,
    lat,
    lng,
    raio,
    page = "1",
    limit = "30",
  } = req.query as Record<string, string>;

  const offset = (Number(page) - 1) * Number(limit);

  const conditions: any[] = [
    eq(comunidadeProfiles.tenantId, tenantId),
    eq(comunidadeProfiles.userType, "fornecedor"),
    eq(comunidadeProfiles.approvalStatus, "aprovado"),
    eq(comunidadeProfiles.ativo, true),
  ];

  if (busca) {
    conditions.push(
      or(
        ilike(comunidadeProfiles.professionalTitle, `%${busca}%`),
        ilike(comunidadeProfiles.areaOfExpertise, `%${busca}%`),
        ilike(comunidadeProfiles.bio, `%${busca}%`),
      )
    );
  }

  if (minRating) {
    conditions.push(sql`${comunidadeProfiles.averageRating} >= ${Number(minRating)}`);
  }

  if (capacidade) {
    conditions.push(eq(comunidadeProfiles.productionCapacity, capacidade));
  }

  if (privateLabel === "true") {
    conditions.push(sql`${comunidadeProfiles.isPrivateLabel} = true`);
  }

  if (somenteVerificados === "true") {
    conditions.push(sql`${comunidadeProfiles.verifiedByAdmin} = true`);
  }

  if (somenteRecomendados === "true") {
    conditions.push(sql`${comunidadeProfiles.recommendedByAdmin} = true`);
  }

  // Busca por localidade (texto livre — cidade, bairro ou estado)
  if (localidade) {
    conditions.push(
      or(
        ilike(comunidadeProfiles.cidade, `%${localidade}%`),
        ilike(comunidadeProfiles.bairro, `%${localidade}%`),
        ilike(comunidadeProfiles.estado, `%${localidade}%`),
      )
    );
  }

  // Filtro por raio de distância (Haversine — só quando lat/lng/raio fornecidos)
  if (lat && lng && raio) {
    const latF = Number(lat);
    const lngF = Number(lng);
    const raioKm = Number(raio);
    conditions.push(
      sql`(
        ${comunidadeProfiles.latitude} IS NULL OR ${comunidadeProfiles.longitude} IS NULL OR
        (6371 * acos(
          GREATEST(-1.0, LEAST(1.0,
            cos(radians(${latF})) * cos(radians(${comunidadeProfiles.latitude}::float)) *
            cos(radians(${comunidadeProfiles.longitude}::float) - radians(${lngF})) +
            sin(radians(${latF})) * sin(radians(${comunidadeProfiles.latitude}::float))
          ))
        )) <= ${raioKm}
      )`
    );
  }

  const suppliers = await db.select().from(comunidadeProfiles)
    .where(and(...conditions))
    .orderBy(desc(comunidadeProfiles.recommendedByAdmin), desc(comunidadeProfiles.averageRating))
    .limit(Number(limit))
    .offset(offset);

  const enriched = await Promise.all(suppliers.map(async (s) => {
    const specialties = await db
      .select({ name: comunidadeEspecialidades.name, code: comunidadeEspecialidades.code })
      .from(comunidadeSupplierSpecialties)
      .leftJoin(comunidadeEspecialidades, eq(comunidadeSupplierSpecialties.specialtyId, comunidadeEspecialidades.id))
      .where(eq(comunidadeSupplierSpecialties.profileId, s.id));
    return { ...s, specialties };
  }));

  res.json(enriched);
});

// ─── FORNECEDOR — PERFIL DETALHADO ────────────────────────────
router.get("/comunidade/fornecedores/:id", async (req: AuthenticatedRequest, res) => {
  const profileId0 = req.params.id;
  const [profile] = await db.select().from(comunidadeProfiles)
    .where(sql`id = ${profileId0} AND ativo = true`);

  if (!profile) { res.status(404).json({ error: "Fornecedor não encontrado" }); return; }

  const [specialties, photos, reviews] = await Promise.all([
    db.select({
      id: comunidadeSupplierSpecialties.id,
      name: comunidadeEspecialidades.name,
      level: comunidadeEspecialidades.level,
      code: comunidadeEspecialidades.code,
      observations: comunidadeSupplierSpecialties.observations,
    })
      .from(comunidadeSupplierSpecialties)
      .leftJoin(comunidadeEspecialidades, eq(comunidadeSupplierSpecialties.specialtyId, comunidadeEspecialidades.id))
      .where(eq(comunidadeSupplierSpecialties.profileId, profile.id)),

    db.select().from(comunidadeSupplierPhotos)
      .where(eq(comunidadeSupplierPhotos.profileId, profile.id))
      .orderBy(asc(comunidadeSupplierPhotos.displayOrder)),

    db.select().from(comunidadeReviews)
      .where(eq(comunidadeReviews.reviewedProfileId, profile.id))
      .orderBy(desc(comunidadeReviews.createdAt))
      .limit(20),
  ]);

  res.json({ ...profile, specialties, photos, reviews });
});

// ─── AVALIAÇÕES ───────────────────────────────────────────────
router.post("/comunidade/fornecedores/:id/avaliacoes", requireAuth, async (req: AuthenticatedRequest, res) => {
  const reviewerId = req.user!.id;
  const { ratingValue, ratingDeadline, ratingQuality, ratingService, comment } = req.body;

  if (!ratingValue || !ratingDeadline || !ratingQuality || !ratingService || !comment) {
    res.status(400).json({ error: "Todos os campos são obrigatórios" }); return;
  }

  const rating = ((Number(ratingValue) + Number(ratingDeadline) + Number(ratingQuality) + Number(ratingService)) / 4).toFixed(2);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [review] = await (db.insert(comunidadeReviews) as any).values({
    reviewerId,
    reviewedProfileId: req.params.id,
    ratingValue: Number(ratingValue),
    ratingDeadline: Number(ratingDeadline),
    ratingQuality: Number(ratingQuality),
    ratingService: Number(ratingService),
    rating,
    comment,
  }).returning();

  const [stats] = await db.select({
    avg: sql<string>`round(avg(rating)::numeric, 2)`,
    count: sql<number>`count(*)`,
  }).from(comunidadeReviews).where(sql`${comunidadeReviews.reviewedProfileId} = ${req.params.id}`);

  const reviewedId = req.params.id;
  await db.update(comunidadeProfiles)
    .set({ averageRating: stats.avg ?? "0", totalReviews: Number(stats.count) })
    .where(sql`id = ${reviewedId}`);

  res.status(201).json(review);
});

// ─── ADMIN — CURADORIA ────────────────────────────────────────
router.get("/comunidade/admin/fornecedores", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.userTenantIds?.[0];
  if (!tenantId) { res.status(403).json({ error: "Tenant não identificado" }); return; }
  const { status = "pendente" } = req.query as Record<string, string>;

  const conditions: any[] = [
    eq(comunidadeProfiles.tenantId, tenantId),
    eq(comunidadeProfiles.userType, "fornecedor"),
  ];
  if (status !== "todos") conditions.push(eq(comunidadeProfiles.approvalStatus, status));

  const suppliers = await db.select().from(comunidadeProfiles)
    .where(and(...conditions))
    .orderBy(desc(comunidadeProfiles.createdAt));
  res.json(suppliers);
});

router.patch("/comunidade/admin/fornecedores/:id/aprovar", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { adminReview, adminRating } = req.body;
  const [row] = await db.update(comunidadeProfiles)
    .set({ approvalStatus: "aprovado", adminReview: adminReview || null, adminRating: adminRating ? Number(adminRating) : null, approvedAt: new Date() })
    .where(sql`id = ${req.params.id}`).returning();
  res.json(row);
});

router.patch("/comunidade/admin/fornecedores/:id/recusar", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { adminReview } = req.body;
  if (!adminReview?.trim()) { res.status(400).json({ error: "Motivo da recusa é obrigatório" }); return; }
  const [row] = await db.update(comunidadeProfiles)
    .set({ approvalStatus: "recusado", adminReview })
    .where(sql`id = ${req.params.id}`).returning();
  res.json(row);
});

router.patch("/comunidade/admin/fornecedores/:id/verificar", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { verified, recommended } = req.body;
  const updates2: Record<string, unknown> = {};
  if (verified !== undefined) updates2.verifiedByAdmin = Boolean(verified);
  if (recommended !== undefined) updates2.recommendedByAdmin = Boolean(recommended);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [row] = await (db.update(comunidadeProfiles) as any)
    .set(updates2)
    .where(sql`id = ${req.params.id}`).returning();
  res.json(row);
});

// ─── PRÉ-CADASTROS ────────────────────────────────────────────

function calcScore(body: any): number {
  let score = 0;
  if (body.name?.trim())    score += 5;
  if (body.email?.trim())   score += 5;
  if (body.phone?.trim())   score += 10;
  if (body.cidade?.trim())  score += 5;
  if (body.estado)          score += 5;
  if (body.portfolioUrl?.trim()) score += 10;
  if (body.productionCapacity)   score += 5;
  if ((body.additionalInfo?.length ?? 0) > 50) score += 10;
  if ((body.mediaUrls?.length ?? 0) > 0)       score += 15;
  const fd = body.formData ?? {};
  if ((fd.tiposOficina?.length ?? 0) > 0)  score += 15;
  const detailArrays = [
    'estampariaTecnicas','bordadoTecnicas','corteSubtypes','lavanderiaSubtypes',
    'lavanderiaTratamentos','modelagemSubtypes','malhariaTipos','tecelagemTipos',
    'tinturariaSubstrato','fiosFibras','fiosFinalidade','acabamentoServicos',
    'tecidosTipos','aviamentosServicos',
  ];
  detailArrays.forEach(k => { if ((fd[k]?.length ?? 0) > 0) score += 1; });
  return Math.min(score, 100);
}

router.post("/comunidade/pre-cadastro", async (req, res) => {
  // ⚠️ tenantSlug é obrigatório — sem fallback silencioso para nenhum tenant.
  const { tenantSlug, name, email, phone, cidade, estado, userType,
    productionCapacity, portfolioUrl, additionalInfo, mediaUrls, formData,
    source, utmSource, utmMedium, utmCampaign } = req.body;

  if (!tenantSlug) {
    res.status(400).json({ error: "tenantSlug é obrigatório" }); return;
  }
  if (!name || !email || !userType) {
    res.status(400).json({ error: "name, email e userType são obrigatórios" }); return;
  }

  const { data: tenantRow } = await supabaseAdmin
    .from("tenants").select("id").eq("slug", tenantSlug).single();

  if (!tenantRow) { res.status(400).json({ error: "Tenant não encontrado" }); return; }

  const scoreQualidade = calcScore(req.body);

  const [row] = await db.insert(comunidadePreCadastros).values({
    tenantId: tenantRow.id, name, email, phone, cidade, estado, userType,
    productionCapacity, portfolioUrl, additionalInfo,
    mediaUrls: mediaUrls ?? null,
    formData:  formData  ?? null,
    scoreQualidade,
    source, utmSource, utmMedium, utmCampaign,
  }).returning();

  // Auto-atualiza o lead Moda Conecta para "Revisão Final" assim que o formulário é preenchido
  try {
    await db.update(modaConectaLeads)
      .set({ status: 'formulario_preenchido', updatedAt: new Date() })
      .where(and(
        eq(modaConectaLeads.email, email.toLowerCase().trim()),
        inArray(modaConectaLeads.status, ['convite_enviado', 'aprovado'])
      ));
  } catch (_) { /* não bloqueia o cadastro se falhar */ }

  res.status(201).json(row);
});

// ─── ADMIN: listar pré-cadastros ──────────────────────────────
router.get("/comunidade/admin/pre-cadastros", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { status, email } = req.query as Record<string, string>;
  const conds: any[] = [];
  if (status && status !== 'todos') conds.push(eq(comunidadePreCadastros.status, status));
  if (email) conds.push(eq(comunidadePreCadastros.email, email.toLowerCase().trim()));
  const rows = await db.select().from(comunidadePreCadastros)
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(comunidadePreCadastros.createdAt));
  res.json(rows);
});

// ─── ADMIN: consultar pré-cadastro por email (DEVE vir ANTES de /:id) ───
router.get("/comunidade/admin/pre-cadastros/by-email", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const email = ((req.query.email as string) || "").toLowerCase().trim();
  if (!email) { res.status(400).json({ error: "email é obrigatório" }); return; }
  const [row] = await db.select().from(comunidadePreCadastros)
    .where(eq(comunidadePreCadastros.email, email))
    .orderBy(desc(comunidadePreCadastros.createdAt));
  if (!row) { res.status(404).json({ error: "Pré-cadastro não encontrado" }); return; }
  res.json(row);
});

// ─── ADMIN: consultar pré-cadastro individual ─────────────────
router.get("/comunidade/admin/pre-cadastros/:id", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const [row] = await db.select().from(comunidadePreCadastros)
    .where(eq(comunidadePreCadastros.id, req.params.id));
  if (!row) { res.status(404).json({ error: "Cadastro não encontrado" }); return; }
  res.json(row);
});

// ─── ADMIN: atualizar status / dados / nota interna ──────────
router.patch("/comunidade/admin/pre-cadastros/:id", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const {
    status, rejectionReason, notaInterna,
    // campos editáveis do cadastro
    name, phone, cidade, estado, portfolioUrl, productionCapacity, additionalInfo, formData,
  } = req.body;
  const allowed = ["pendente", "aprovado", "reprovado", "revisao", "formulario_preenchido", "acesso_liberado"];
  if (status && !allowed.includes(status)) {
    res.status(400).json({ error: "Status inválido" }); return;
  }
  const updates: Record<string, any> = {};
  if (status)                          updates.status             = status;
  if (rejectionReason !== undefined)   updates.rejectionReason    = rejectionReason;
  if (notaInterna !== undefined)       updates.notaInterna        = notaInterna;
  if (name !== undefined)              updates.name               = name;
  if (phone !== undefined)             updates.phone              = phone;
  if (cidade !== undefined)            updates.cidade             = cidade;
  if (estado !== undefined)            updates.estado             = estado;
  if (portfolioUrl !== undefined)      updates.portfolioUrl       = portfolioUrl;
  if (productionCapacity !== undefined) updates.productionCapacity = productionCapacity;
  if (additionalInfo !== undefined)    updates.additionalInfo     = additionalInfo;
  if (formData !== undefined)          updates.formData           = formData;
  if (status === "aprovado" || status === "acesso_liberado") updates.approvedAt = new Date();

  const [row] = await db.update(comunidadePreCadastros)
    .set(updates)
    .where(eq(comunidadePreCadastros.id, id))
    .returning();
  res.json(row);
});

// ─── ADMIN: notificar aprovação via WhatsApp (Hub link) ──────
router.post("/comunidade/admin/pre-cadastros/:id/notificar-hub", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const [lead] = await db.select().from(comunidadePreCadastros)
    .where(eq(comunidadePreCadastros.id, req.params.id));
  if (!lead) { res.status(404).json({ error: "Cadastro não encontrado" }); return; }

  const phone = lead.phone?.replace(/\D/g, '') ?? '';
  if (!phone) {
    res.json({ ok: true, whatsappSent: false, reason: "Telefone não informado" });
    return;
  }

  const firstName = (lead.name ?? '').split(' ')[0];
  const hubUrl = process.env.HUB_URL || 'https://gestaomirage.com.br/hub';
  const msg = `Olá, ${firstName}! 🎉\n\nSeu cadastro no *Moda Conecta* foi aprovado!\n\nAcesse agora o Hub para explorar a comunidade de fornecedores e iniciar seu período gratuito:\n${hubUrl}\n\nQualquer dúvida é só chamar. Seja bem-vindo! 🧵`;

  let whatsappSent = false;
  try {
    const zapiRes = await fetch(`${req.protocol}://${req.headers.host}/api/internal/zapi/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_slug: 'mirage',
        phone,
        message: msg,
        route_type: 'moda-conecta-aprovacao',
      }),
    });
    whatsappSent = zapiRes.ok;
  } catch { /* fire-and-forget */ }

  res.json({ ok: true, whatsappSent });
});

// ─── ADMIN: reprovar pré-cadastro ────────────────────────────
router.post("/comunidade/admin/pre-cadastros/:id/reprovar", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { motivo } = req.body;
  await db.update(comunidadePreCadastros)
    .set({ status: "reprovado", rejectionReason: motivo ?? null })
    .where(eq(comunidadePreCadastros.id, req.params.id));
  res.json({ ok: true });
});

// ─── ADMIN: aprovar formulário SEM gerar convite ao Hub ──────
router.post("/comunidade/admin/pre-cadastros/:id/aprovar-sem-convite", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const [row] = await db.update(comunidadePreCadastros)
    .set({ status: "aprovado", approvedAt: new Date() })
    .where(eq(comunidadePreCadastros.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Cadastro não encontrado" }); return; }
  res.json({ ok: true, row });
});

// ─── ADMIN: gerar link de acesso ao Hub (sem enviar e-mail) ──
router.post("/comunidade/admin/pre-cadastros/:id/gerar-link-hub", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const [lead] = await db.select().from(comunidadePreCadastros)
    .where(eq(comunidadePreCadastros.id, req.params.id));
  if (!lead) { res.status(404).json({ error: "Cadastro não encontrado" }); return; }

  const HUB_URL = "https://www.gestaomirage.com.br";
  const REDIRECT_TO = `${HUB_URL}/hub/comunidade/fornecedores`;

  // Gera link de acesso. Tenta "invite" primeiro; se o usuário já existe
  // no Supabase, cai para "magiclink" que funciona para qualquer email.
  let rawLink = "";
  try {
    const { data: inviteData, error: inviteError } = await (supabaseAdmin.auth.admin as any).generateLink({
      type: "invite",
      email: lead.email,
      options: { data: { full_name: lead.name }, redirectTo: REDIRECT_TO },
    });

    if (inviteError) {
      // Usuário já existe — usa magiclink
      const { data: magicData, error: magicError } = await (supabaseAdmin.auth.admin as any).generateLink({
        type: "magiclink",
        email: lead.email,
        options: { redirectTo: REDIRECT_TO },
      });
      if (magicError) {
        res.status(400).json({ error: magicError.message }); return;
      }
      rawLink = magicData?.properties?.action_link ?? magicData?.action_link ?? "";
    } else {
      rawLink = inviteData?.properties?.action_link ?? inviteData?.action_link ?? "";
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Erro ao gerar link" }); return;
  }

  if (!rawLink) {
    res.status(500).json({ error: "Supabase não retornou um link válido" }); return;
  }

  // Corrige o redirect_to — Supabase pode embutir a Site URL do painel
  const magicLink = rawLink.replace(
    /redirect_to=[^&]*/,
    `redirect_to=${encodeURIComponent(REDIRECT_TO)}`
  );

  // Gera token curto e salva o magic link no banco para criar link limpo
  const { randomBytes } = await import("crypto");
  const accessToken = randomBytes(16).toString("hex"); // 32 chars

  // Marca como acesso_liberado, salva token e magic link
  await db.update(comunidadePreCadastros)
    .set({ status: "acesso_liberado", approvedAt: new Date(), hubAccessToken: accessToken, hubMagicLink: magicLink })
    .where(eq(comunidadePreCadastros.id, req.params.id));

  try {
    await db.update(modaConectaLeads)
      .set({ status: "acesso_liberado", updatedAt: new Date() })
      .where(eq(modaConectaLeads.email, lead.email.toLowerCase().trim()));
  } catch (_) {}

  // Retorna link limpo para o admin copiar e enviar
  const hubLink = `${HUB_URL}/acesso/${accessToken}`;
  res.json({ ok: true, hubLink });
});

// ─── PÚBLICO: redireciona link limpo → magic link do Supabase ──
router.get("/acesso/:token", async (req, res) => {
  const [row] = await db.select().from(comunidadePreCadastros)
    .where(eq(comunidadePreCadastros.hubAccessToken, req.params.token));

  if (!row || !row.hubMagicLink) {
    res.status(404).send("Link inválido ou expirado."); return;
  }

  res.redirect(302, row.hubMagicLink);
});

// ─── ADMIN: aprovar + enviar e-mail de convite ───────────────
router.post("/comunidade/admin/pre-cadastros/:id/aprovar", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const [lead] = await db.select().from(comunidadePreCadastros)
    .where(eq(comunidadePreCadastros.id, id));
  if (!lead) { res.status(404).json({ error: "Lead não encontrado" }); return; }

  await db.update(comunidadePreCadastros)
    .set({ status: "aprovado", approvedAt: new Date() })
    .where(eq(comunidadePreCadastros.id, id));

  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u: any) => u.email === lead.email);

  let inviteResult: any = {};
  if (existing) {
    // ✅ usa lead.tenantId (UUID já resolvido na submissão) — sem hardcode de slug
    await supabaseAdmin.from("tenant_users").upsert(
      { tenant_id: lead.tenantId, user_id: existing.id, role: "member" },
      { onConflict: "tenant_id,user_id" }
    );
    inviteResult = { tipo: "vinculo_direto", user_id: existing.id };
  } else {
    const HUB_URL = process.env.HUB_URL ?? "https://www.gestaomirage.com.br";
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(lead.email, {
      data: { full_name: lead.name, pending_role: "member" },
      redirectTo: `${HUB_URL}/hub/comunidade/fornecedores`,
    });
    if (error) { res.status(400).json({ error: error.message }); return; }
    inviteResult = { tipo: "convite_email", user_id: data.user.id };
  }

  res.json({ ok: true, ...inviteResult });
});

// ─── PÚBLICO: contagem de aprovados (para contador de vagas) ──
router.get("/comunidade/pre-cadastros/contagem", async (_req, res) => {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comunidadePreCadastros)
    .where(eq(comunidadePreCadastros.status, "aprovado"));
  res.json({ aprovados: count ?? 0, total_vagas: 500, restantes: Math.max(0, 500 - (count ?? 0)) });
});

export default router;
