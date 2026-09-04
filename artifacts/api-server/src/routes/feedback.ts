import { Router } from "express";
import { db, feedback, errorLogs } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireSuperAdmin, type AuthenticatedRequest } from "../middlewares/auth";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

// POST /feedback — qualquer usuário autenticado envia feedback
router.post("/feedback", requireAuth as any, async (req: AuthenticatedRequest, res) => {
  const { type, title, description, pageUrl } = req.body;
  if (!title) return res.status(400).json({ error: "Título obrigatório" });

  const { data: tuData } = await supabaseAdmin
    .from("tenant_users")
    .select("tenant_id, tenants(name)")
    .eq("user_id", req.user!.id)
    .maybeSingle();

  const tenantRaw = tuData?.tenants as any;
  const tenantName = Array.isArray(tenantRaw) ? tenantRaw[0]?.name : tenantRaw?.name ?? "Desconhecido";

  const [row] = await db.insert(feedback).values({
    tenantId: tuData?.tenant_id ?? null,
    tenantName,
    userEmail: req.user!.email ?? null,
    type: type ?? "sugestao",
    title,
    description: description ?? null,
    pageUrl: pageUrl ?? null,
    status: "novo",
  }).returning();

  res.json(row);
});

// GET /feedback — super admin lista todos
router.get("/feedback", requireSuperAdmin as any, async (_req, res) => {
  const rows = await db.select().from(feedback).orderBy(desc(feedback.createdAt));
  res.json(rows);
});

// PATCH /feedback/:id — super admin atualiza status/notas
router.patch("/feedback/:id", requireSuperAdmin as any, async (req, res) => {
  const { status, adminNotes } = req.body;
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (status) updates.status = status;
  if (adminNotes !== undefined) updates.adminNotes = adminNotes;

  const [row] = await db.update(feedback).set(updates).where(eq(feedback.id, req.params.id)).returning();
  res.json(row);
});

// POST /error-log — frontend envia erro automaticamente (auth opcional)
router.post("/error-log", async (req: AuthenticatedRequest, res) => {
  try {
    const { errorMessage, stack, pageUrl, userAgent, context, tenantId, userEmail } = req.body;
    if (!errorMessage) return res.status(400).json({ error: "errorMessage obrigatório" });

    await db.insert(errorLogs).values({
      tenantId: tenantId ?? null,
      userEmail: userEmail ?? null,
      errorMessage: String(errorMessage).slice(0, 2000),
      stack: stack ? String(stack).slice(0, 5000) : null,
      pageUrl: pageUrl ?? null,
      userAgent: userAgent ?? null,
      context: context ? JSON.stringify(context).slice(0, 2000) : null,
    });

    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// GET /error-log — super admin lista erros
router.get("/error-log", requireSuperAdmin as any, async (req, res) => {
  const rows = await db.select().from(errorLogs).orderBy(desc(errorLogs.createdAt)).limit(200);
  res.json(rows);
});

export default router;
