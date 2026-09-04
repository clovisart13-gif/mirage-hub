import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { requireAuth, requireSuperAdmin, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

export async function ensureOperationalEventsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS operational_events (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'error',
      module TEXT,
      description TEXT NOT NULL,
      metadata JSONB,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS op_events_tenant_idx ON operational_events (tenant_id);
    CREATE INDEX IF NOT EXISTS op_events_severity_idx ON operational_events (severity, created_at DESC);
    CREATE INDEX IF NOT EXISTS op_events_module_idx ON operational_events (module, created_at DESC);
  `);
}

export async function logOperationalEvent(params: {
  tenantId?: string;
  eventType: string;
  severity?: "info" | "warning" | "error" | "critical";
  module?: string;
  description: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO operational_events (tenant_id, event_type, severity, module, description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.tenantId ?? null,
        params.eventType,
        params.severity ?? "error",
        params.module ?? null,
        params.description,
        params.metadata ? JSON.stringify(params.metadata) : null,
      ]
    );
  } catch {
    // Falha silenciosa — não propagar erro de log para não afetar fluxo principal
  }
}

router.get("/admin/operational-events", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { severity, module: mod, tenant_id, limit = "50" } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (severity) { conditions.push(`severity = $${idx++}`); params.push(severity); }
  if (mod)      { conditions.push(`module = $${idx++}`); params.push(mod); }
  if (tenant_id){ conditions.push(`tenant_id = $${idx++}`); params.push(tenant_id); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const lim = Math.min(parseInt(limit, 10) || 50, 500);

  try {
    const result = await pool.query(
      `SELECT * FROM operational_events ${where} ORDER BY created_at DESC LIMIT $${idx}`,
      [...params, lim]
    );
    res.json({ events: result.rows, total: result.rowCount });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Erro ao buscar eventos operacionais");
    res.status(500).json({ error: err.message });
  }
});

router.patch("/admin/operational-events/:id/resolve", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      `UPDATE operational_events SET resolved_at = NOW() WHERE id = $1`,
      [id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    req.log.error({ err: err.message, id }, "Erro ao resolver evento operacional");
    res.status(500).json({ error: err.message });
  }
});

// ─── BACKUP ENDPOINTS ────────────────────────────────────────────────────────

router.post("/admin/backup/run", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { runDbBackup } = await import("../lib/dbBackup");
    const result = await runDbBackup();
    if (result.ok) {
      res.json({ ok: true, fileName: result.fileName, sizeKb: result.sizeKb });
    } else {
      res.status(500).json({ ok: false, error: result.error });
    }
  } catch (err: any) {
    req.log.error({ err: err.message }, "Erro ao executar backup manual");
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/admin/backup/list", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { listDbBackups } = await import("../lib/dbBackup");
    const backups = await listDbBackups();
    res.json({ backups });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Erro ao listar backups");
    res.status(500).json({ error: err.message });
  }
});

export default router;
