import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger";

const router = Router();

// POST /api/internal/zapi/capture
// Endpoint público (sem auth) — captura o payload cru que a Z-API envia
// Use temporariamente: aponte "Ao receber" da Z-API para esta URL, mande uma msg, depois restaure.
router.post("/internal/zapi/capture", async (req: Request, res: Response) => {
  const body = req.body;
  const headers = Object.fromEntries(
    Object.entries(req.headers).filter(([k]) =>
      !["authorization", "cookie", "x-internal-key"].includes(k)
    )
  );

  logger.info({ body, headers }, "zapi-capture: payload recebido");

  try {
    await db.execute(
      sql`INSERT INTO zapi_payload_captures (body, headers) VALUES (${JSON.stringify(body)}::jsonb, ${JSON.stringify(headers)}::jsonb)`
    );
  } catch (e: any) {
    logger.warn({ err: e?.message }, "zapi-capture: falha ao salvar no banco (ignorando)");
  }

  res.status(200).json({ ok: true, received: body });
});

// GET /api/internal/zapi/capture — lista últimas capturas (protegido por x-internal-key)
router.get("/internal/zapi/capture", async (req: Request, res: Response) => {
  const key = process.env["MARKETING_INTERNAL_API_KEY"];
  if (!key || req.headers["x-internal-key"] !== key) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const rows = await db.execute(
      sql`SELECT id, captured_at, body, headers FROM zapi_payload_captures ORDER BY captured_at DESC LIMIT 10`
    );
    res.json({ captures: rows.rows });
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

// DELETE /api/internal/zapi/capture — limpa capturas antigas
router.delete("/internal/zapi/capture", async (req: Request, res: Response) => {
  const key = process.env["MARKETING_INTERNAL_API_KEY"];
  if (!key || req.headers["x-internal-key"] !== key) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await db.execute(sql`TRUNCATE zapi_payload_captures`);
  res.json({ ok: true });
});

export default router;
