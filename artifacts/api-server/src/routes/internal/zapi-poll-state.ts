import { Router } from "express";

const router = Router();

const lastSeen: Record<string, number> = {};
let initialized = false;

router.get("/internal/zapi-poll/state", (_req, res) => {
  res.json({ initialized, lastSeen });
});

router.post("/internal/zapi-poll/state", (req, res) => {
  const { phones, markInitialized, reset } = req.body as {
    phones?: Record<string, number>;
    markInitialized?: boolean;
    reset?: boolean;
  };
  if (reset) {
    for (const key of Object.keys(lastSeen)) delete lastSeen[key];
    initialized = false;
    return res.json({ ok: true, reset: true, count: 0, initialized: false });
  }
  if (phones && typeof phones === "object") {
    for (const [phone, ts] of Object.entries(phones)) {
      lastSeen[phone] = Number(ts);
    }
  }
  if (markInitialized) initialized = true;
  res.json({ ok: true, count: Object.keys(lastSeen).length, initialized });
});

export default router;
