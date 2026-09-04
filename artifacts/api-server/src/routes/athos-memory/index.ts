/**
 * ATHOS MEMORY API — Base de Consciência Estratégica 360°
 *
 * Rotas internas protegidas (requireSuperAdmin).
 * Gerenciam os 4 domínios da memória estratégica do ATHOS:
 *   /athos-memory/blueprints         → Company Master Blueprints
 *   /athos-memory/market             → Market Intelligence Profiles
 *   /athos-memory/entries            → Strategic Memory Entries
 *   /athos-memory/snapshots          → Executive Snapshots
 */

import { Router } from "express";
import { eq, desc, and, ilike, sql } from "drizzle-orm";
import {
  db,
  companyMasterBlueprints,
  marketIntelligenceProfiles,
  strategicMemoryEntries,
  executiveSnapshots,
} from "@workspace/db";
import { requireAuth, requireSuperAdmin, type AuthenticatedRequest } from "../../middlewares/auth";

const router = Router();
const guard = [requireAuth, requireSuperAdmin];

// ════════════════════════════════════════════════════════════════════════════════
// COMPANY MASTER BLUEPRINTS
// ════════════════════════════════════════════════════════════════════════════════

// GET /athos-memory/blueprints
router.get("/athos-memory/blueprints", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    const rows = await db.select().from(companyMasterBlueprints).orderBy(desc(companyMasterBlueprints.updatedAt));
    res.json({ ok: true, blueprints: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /athos-memory/blueprints/:slug
router.get("/athos-memory/blueprints/:slug", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    const [row] = await db.select().from(companyMasterBlueprints)
      .where(eq(companyMasterBlueprints.companySlug, req.params.slug)).limit(1);
    if (!row) return res.status(404).json({ error: "Blueprint não encontrado" });
    res.json({ ok: true, blueprint: row });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /athos-memory/blueprints — create or upsert by slug
router.post("/athos-memory/blueprints", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    const { company_slug, company_name, type = "other", ...rest } = req.body;
    if (!company_slug || !company_name) return res.status(400).json({ error: "company_slug e company_name obrigatórios" });

    const fields = {
      companySlug: company_slug,
      companyName: company_name,
      type,
      brandIdentityJson:  rest.brand_identity ?? null,
      positioningJson:    rest.positioning ?? null,
      audienceJson:       rest.audience ?? null,
      offersJson:         rest.offers ?? null,
      channelsJson:       rest.channels ?? null,
      operationsJson:     rest.operations ?? null,
      goalsJson:          rest.goals ?? null,
      objectionsJson:     rest.objections ?? null,
      competitorsJson:    rest.competitors ?? null,
      visualSystemJson:   rest.visual_system ?? null,
      strategicNotesJson: rest.strategic_notes ?? null,
      confidenceScore:    rest.confidence_score ?? "0",
      status:             rest.status ?? "draft",
      updatedBy:          req.user?.email ?? "system",
      updatedAt:          new Date(),
    };

    const existing = await db.select({ id: companyMasterBlueprints.id })
      .from(companyMasterBlueprints).where(eq(companyMasterBlueprints.companySlug, company_slug)).limit(1);

    let row;
    if (existing.length) {
      [row] = await db.update(companyMasterBlueprints).set(fields)
        .where(eq(companyMasterBlueprints.companySlug, company_slug)).returning();
    } else {
      [row] = await db.insert(companyMasterBlueprints).values(fields).returning();
    }
    res.json({ ok: true, blueprint: row });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /athos-memory/blueprints/:slug — partial update (any JSON fields)
router.patch("/athos-memory/blueprints/:slug", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    const keyMap: Record<string, string> = {
      brand_identity: "brandIdentityJson", positioning: "positioningJson",
      audience: "audienceJson", offers: "offersJson", channels: "channelsJson",
      operations: "operationsJson", goals: "goalsJson", objections: "objectionsJson",
      competitors: "competitorsJson", visual_system: "visualSystemJson",
      strategic_notes: "strategicNotesJson", confidence_score: "confidenceScore",
      status: "status", company_name: "companyName", type: "type",
    };
    const updates: Record<string, unknown> = { updatedAt: new Date(), updatedBy: req.user?.email ?? "system" };
    for (const [k, v] of Object.entries(req.body)) {
      const dbKey = keyMap[k];
      if (dbKey) updates[dbKey] = v;
    }
    const [row] = await db.update(companyMasterBlueprints).set(updates as any)
      .where(eq(companyMasterBlueprints.companySlug, req.params.slug)).returning();
    if (!row) return res.status(404).json({ error: "Não encontrado" });
    res.json({ ok: true, blueprint: row });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /athos-memory/blueprints/:slug
router.delete("/athos-memory/blueprints/:slug", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    await db.delete(companyMasterBlueprints).where(eq(companyMasterBlueprints.companySlug, req.params.slug));
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════════
// MARKET INTELLIGENCE PROFILES
// ════════════════════════════════════════════════════════════════════════════════

// GET /athos-memory/market
router.get("/athos-memory/market", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    const rows = await db.select().from(marketIntelligenceProfiles).orderBy(desc(marketIntelligenceProfiles.updatedAt));
    res.json({ ok: true, profiles: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /athos-memory/market/:domainKey
router.get("/athos-memory/market/:domainKey", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    const [row] = await db.select().from(marketIntelligenceProfiles)
      .where(eq(marketIntelligenceProfiles.domainKey, req.params.domainKey)).limit(1);
    if (!row) return res.status(404).json({ error: "Perfil não encontrado" });
    res.json({ ok: true, profile: row });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /athos-memory/market — create or upsert by domain_key
router.post("/athos-memory/market", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    const { domain_key, title, ...rest } = req.body;
    if (!domain_key || !title) return res.status(400).json({ error: "domain_key e title obrigatórios" });

    const fields = {
      domainKey:            domain_key,
      title,
      marketSummaryJson:    rest.market_summary ?? null,
      customerBehaviorJson: rest.customer_behavior ?? null,
      painsJson:            rest.pains ?? null,
      opportunitiesJson:    rest.opportunities ?? null,
      threatsJson:          rest.threats ?? null,
      competitorsJson:      rest.competitors ?? null,
      trendsJson:           rest.trends ?? null,
      terminologyJson:      rest.terminology ?? null,
      confidenceScore:      rest.confidence_score ?? "0",
      status:               rest.status ?? "draft",
      updatedAt:            new Date(),
    };

    const existing = await db.select({ id: marketIntelligenceProfiles.id })
      .from(marketIntelligenceProfiles).where(eq(marketIntelligenceProfiles.domainKey, domain_key)).limit(1);

    let row;
    if (existing.length) {
      [row] = await db.update(marketIntelligenceProfiles).set(fields)
        .where(eq(marketIntelligenceProfiles.domainKey, domain_key)).returning();
    } else {
      [row] = await db.insert(marketIntelligenceProfiles).values(fields).returning();
    }
    res.json({ ok: true, profile: row });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /athos-memory/market/:domainKey
router.patch("/athos-memory/market/:domainKey", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    const keyMap: Record<string, string> = {
      title: "title", market_summary: "marketSummaryJson",
      customer_behavior: "customerBehaviorJson", pains: "painsJson",
      opportunities: "opportunitiesJson", threats: "threatsJson",
      competitors: "competitorsJson", trends: "trendsJson",
      terminology: "terminologyJson", confidence_score: "confidenceScore", status: "status",
    };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(req.body)) {
      const dbKey = keyMap[k];
      if (dbKey) updates[dbKey] = v;
    }
    const [row] = await db.update(marketIntelligenceProfiles).set(updates as any)
      .where(eq(marketIntelligenceProfiles.domainKey, req.params.domainKey)).returning();
    if (!row) return res.status(404).json({ error: "Não encontrado" });
    res.json({ ok: true, profile: row });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /athos-memory/market/:domainKey
router.delete("/athos-memory/market/:domainKey", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    await db.delete(marketIntelligenceProfiles).where(eq(marketIntelligenceProfiles.domainKey, req.params.domainKey));
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════════
// STRATEGIC MEMORY ENTRIES
// ════════════════════════════════════════════════════════════════════════════════

// GET /athos-memory/entries?entity_key=r2pb&category=positioning&source_type=manual&q=texto
router.get("/athos-memory/entries", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    let query = db.select().from(strategicMemoryEntries).$dynamic();
    const conditions = [];
    if (req.query.entity_key)  conditions.push(eq(strategicMemoryEntries.entityKey, req.query.entity_key as string));
    if (req.query.entity_type) conditions.push(eq(strategicMemoryEntries.entityType, req.query.entity_type as string));
    if (req.query.category)    conditions.push(eq(strategicMemoryEntries.category, req.query.category as string));
    if (req.query.source_type) conditions.push(eq(strategicMemoryEntries.sourceType, req.query.source_type as string));
    if (req.query.q)           conditions.push(ilike(strategicMemoryEntries.content, `%${req.query.q}%`));
    if (conditions.length) query = query.where(and(...conditions) as any);
    const rows = await query.orderBy(desc(strategicMemoryEntries.createdAt)).limit(200);
    res.json({ ok: true, entries: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /athos-memory/entries/:id
router.get("/athos-memory/entries/:id", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    const [row] = await db.select().from(strategicMemoryEntries)
      .where(eq(strategicMemoryEntries.id, Number(req.params.id))).limit(1);
    if (!row) return res.status(404).json({ error: "Entrada não encontrada" });
    res.json({ ok: true, entry: row });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /athos-memory/entries
router.post("/athos-memory/entries", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    const { entity_type, entity_key, category, title, content, source_type, confidence_level, tags, effective_from, effective_until } = req.body;
    if (!entity_type || !entity_key || !category || !title || !content)
      return res.status(400).json({ error: "entity_type, entity_key, category, title, content obrigatórios" });
    const [row] = await db.insert(strategicMemoryEntries).values({
      entityType:      entity_type,
      entityKey:       entity_key,
      category,
      title,
      content,
      sourceType:      source_type ?? "manual",
      confidenceLevel: confidence_level ?? "medium",
      tags:            tags ?? null,
      effectiveFrom:   effective_from ? new Date(effective_from) : null,
      effectiveUntil:  effective_until ? new Date(effective_until) : null,
    }).returning();
    res.json({ ok: true, entry: row });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /athos-memory/entries/:id
router.patch("/athos-memory/entries/:id", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    const keyMap: Record<string, string> = {
      title: "title", content: "content", category: "category",
      confidence_level: "confidenceLevel", source_type: "sourceType",
      tags: "tags", effective_from: "effectiveFrom", effective_until: "effectiveUntil",
    };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(req.body)) {
      const dbKey = keyMap[k];
      if (dbKey) updates[dbKey] = v;
    }
    const [row] = await db.update(strategicMemoryEntries).set(updates as any)
      .where(eq(strategicMemoryEntries.id, Number(req.params.id))).returning();
    if (!row) return res.status(404).json({ error: "Não encontrado" });
    res.json({ ok: true, entry: row });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /athos-memory/entries/:id
router.delete("/athos-memory/entries/:id", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    await db.delete(strategicMemoryEntries).where(eq(strategicMemoryEntries.id, Number(req.params.id)));
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════════
// EXECUTIVE SNAPSHOTS
// ════════════════════════════════════════════════════════════════════════════════

// GET /athos-memory/snapshots
router.get("/athos-memory/snapshots", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    const rows = await db.select().from(executiveSnapshots).orderBy(desc(executiveSnapshots.updatedAt));
    res.json({ ok: true, snapshots: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /athos-memory/snapshots/:slug
router.get("/athos-memory/snapshots/:slug", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    const [row] = await db.select().from(executiveSnapshots)
      .where(eq(executiveSnapshots.companySlug, req.params.slug)).limit(1);
    if (!row) return res.status(404).json({ error: "Snapshot não encontrado" });
    res.json({ ok: true, snapshot: row });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /athos-memory/snapshots — create or upsert by company_slug
router.post("/athos-memory/snapshots", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    const { company_slug, ...rest } = req.body;
    if (!company_slug) return res.status(400).json({ error: "company_slug obrigatório" });

    const fields = {
      companySlug:       company_slug,
      summaryJson:       rest.summary ?? null,
      prioritiesJson:    rest.priorities ?? null,
      risksJson:         rest.risks ?? null,
      opportunitiesJson: rest.opportunities ?? null,
      metricsJson:       rest.metrics ?? null,
      currentStage:      rest.current_stage ?? null,
      status:            rest.status ?? "draft",
      updatedAt:         new Date(),
    };

    const existing = await db.select({ id: executiveSnapshots.id })
      .from(executiveSnapshots).where(eq(executiveSnapshots.companySlug, company_slug)).limit(1);

    let row;
    if (existing.length) {
      [row] = await db.update(executiveSnapshots).set(fields)
        .where(eq(executiveSnapshots.companySlug, company_slug)).returning();
    } else {
      [row] = await db.insert(executiveSnapshots).values(fields).returning();
    }
    res.json({ ok: true, snapshot: row });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /athos-memory/snapshots/:slug
router.patch("/athos-memory/snapshots/:slug", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    const keyMap: Record<string, string> = {
      summary: "summaryJson", priorities: "prioritiesJson", risks: "risksJson",
      opportunities: "opportunitiesJson", metrics: "metricsJson",
      current_stage: "currentStage", status: "status",
    };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(req.body)) {
      const dbKey = keyMap[k];
      if (dbKey) updates[dbKey] = v;
    }
    const [row] = await db.update(executiveSnapshots).set(updates as any)
      .where(eq(executiveSnapshots.companySlug, req.params.slug)).returning();
    if (!row) return res.status(404).json({ error: "Não encontrado" });
    res.json({ ok: true, snapshot: row });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /athos-memory/snapshots/:slug
router.delete("/athos-memory/snapshots/:slug", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    await db.delete(executiveSnapshots).where(eq(executiveSnapshots.companySlug, req.params.slug));
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════════
// CONTEXT READER — rota para o ATHOS buscar contexto completo de uma empresa
// GET /athos-memory/context/:slug — retorna blueprint + snapshot + entries recentes
// ════════════════════════════════════════════════════════════════════════════════
router.get("/athos-memory/context/:slug", ...guard, async (req: AuthenticatedRequest, res) => {
  try {
    const slug = req.params.slug;
    const [blueprint] = await db.select().from(companyMasterBlueprints)
      .where(eq(companyMasterBlueprints.companySlug, slug)).limit(1);
    const [snapshot] = await db.select().from(executiveSnapshots)
      .where(eq(executiveSnapshots.companySlug, slug)).limit(1);
    const entries = await db.select().from(strategicMemoryEntries)
      .where(eq(strategicMemoryEntries.entityKey, slug))
      .orderBy(desc(strategicMemoryEntries.createdAt)).limit(50);
    res.json({ ok: true, slug, blueprint: blueprint ?? null, snapshot: snapshot ?? null, entries });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
