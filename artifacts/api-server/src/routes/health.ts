import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// The artifact supervisor probes the API service base path during promotion.
router.get("/", (_req, res) => {
  const base = HealthCheckResponse.parse({ status: "ok" });
  const mem = process.memoryUsage();
  res.json({
    ...base,
    uptime_s: Math.floor(process.uptime()),
    memory: {
      rss_mb: Math.round(mem.rss / 1024 / 1024),
      heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
    },
  });
});

router.get("/healthz", (_req, res) => {
  const base = HealthCheckResponse.parse({ status: "ok" });
  const mem = process.memoryUsage();
  res.json({
    ...base,
    uptime_s: Math.floor(process.uptime()),
    memory: {
      rss_mb: Math.round(mem.rss / 1024 / 1024),
      heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
    },
  });
});

export default router;
