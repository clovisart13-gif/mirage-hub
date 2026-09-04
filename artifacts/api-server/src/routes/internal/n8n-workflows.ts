/**
 * /internal/n8n/workflows — Gerenciamento de workflows n8n pelo ATHOS
 *
 * Permite que o ATHOS (e diagnósticos internos) listem, ativem e desativem
 * workflows n8n sem precisar de acesso manual ao painel.
 *
 * Auth: x-internal-key (MARKETING_INTERNAL_API_KEY)
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { checkN8nWorkflowHealth } from "../../jobs/n8nHealthMonitor";
import {
  activateWorkflow,
  activateWorkflowByName,
  deactivateWorkflow,
  deactivateWorkflowByName,
  listWorkflows,
} from "../mentor/athosBridge";
import { requireWorkflowTenantScope, type WorkflowScope } from "../../lib/workflowScope";

const router = Router();

// ── Auth ──────────────────────────────────────────────────────────────────────

function requireInternalKey(req: Request, res: Response, next: () => void) {
  const key = process.env["MARKETING_INTERNAL_API_KEY"];
  if (!key) { res.status(503).json({ error: "Internal key not configured" }); return; }
  const provided = req.headers["x-internal-key"];
  if (!provided || provided !== key) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

function requireScopedRequest(req: Request, action: string): {
  scope: WorkflowScope;
  tenant: string | undefined;
} {
  const source = req.method === "GET" ? req.query : req.body;
  return requireWorkflowTenantScope(source as unknown as Record<string, unknown>, action);
}

function sendScopedError(res: Response, err: unknown, action: string): void {
  const message = err instanceof Error ? err.message : "Erro ao operar workflow";
  const status = /scope obrigatório|tenant_id\/company_slug obrigatório|não pertence ao escopo|não tem prefixo|platform não aceita/i.test(message)
    ? 400
    : 502;
  logger.error({ action, err: message }, "[n8n-workflows] operação bloqueada");
  res.status(status).json({ ok: false, error: message });
}

// ── GET /internal/n8n/workflows — lista com status ──────────────────────────

router.get("/internal/n8n/workflows", requireInternalKey, async (req: Request, res: Response) => {
  try {
    const { scope, tenant } = requireScopedRequest(req, "list_n8n_workflows");
    const workflows = await listWorkflows(scope);
    res.json({ ok: true, scope, tenant, total: workflows.length, workflows });
  } catch (err) {
    sendScopedError(res, err, "list_n8n_workflows");
  }
});

// ── POST /internal/n8n/workflows/:id/activate ────────────────────────────────

router.post("/internal/n8n/workflows/:id/activate", requireInternalKey, async (req: Request, res: Response) => {
  const workflowId = String(req.params.id);
  try {
    const { scope, tenant } = requireScopedRequest(req, "activate_n8n_workflow");
    await activateWorkflow(workflowId, scope);
    logger.info({ workflowId, scope, tenant }, "[n8n-workflows] workflow ativado");
    res.json({ ok: true, scope, tenant, workflowId, active: true });
  } catch (err) {
    sendScopedError(res, err, "activate_n8n_workflow");
  }
});

// ── POST /internal/n8n/workflows/:id/deactivate ──────────────────────────────

router.post("/internal/n8n/workflows/:id/deactivate", requireInternalKey, async (req: Request, res: Response) => {
  const workflowId = String(req.params.id);
  try {
    const { scope, tenant } = requireScopedRequest(req, "deactivate_n8n_workflow");
    await deactivateWorkflow(workflowId, scope);
    logger.info({ workflowId, scope, tenant }, "[n8n-workflows] workflow desativado");
    res.json({ ok: true, scope, tenant, workflowId, active: false });
  } catch (err) {
    sendScopedError(res, err, "deactivate_n8n_workflow");
  }
});

// ── POST /internal/n8n/workflows/by-name/activate ────────────────────────────
// Conveniente para o ATHOS que sabe o nome mas não o ID

router.post("/internal/n8n/workflows/by-name/activate", requireInternalKey, async (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name) { res.status(400).json({ ok: false, error: "Campo 'name' obrigatório" }); return; }

  try {
    const { scope, tenant } = requireScopedRequest(req, "activate_workflow_by_name");
    const workflow = await activateWorkflowByName(name, scope);
    logger.info({ ...workflow, scope, tenant }, "[n8n-workflows] workflow ativado por nome");
    res.json({ ok: true, scope, tenant, workflow });
  } catch (err) {
    sendScopedError(res, err, "activate_workflow_by_name");
  }
});

// ── POST /internal/n8n/workflows/by-name/deactivate ──────────────────────────

router.post("/internal/n8n/workflows/by-name/deactivate", requireInternalKey, async (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name) { res.status(400).json({ ok: false, error: "Campo 'name' obrigatório" }); return; }

  try {
    const { scope, tenant } = requireScopedRequest(req, "deactivate_workflow_by_name");
    const workflow = await deactivateWorkflowByName(name, scope);
    logger.info({ ...workflow, scope, tenant }, "[n8n-workflows] workflow desativado por nome");
    res.json({ ok: true, scope, tenant, workflow });
  } catch (err) {
    sendScopedError(res, err, "deactivate_workflow_by_name");
  }
});

// ── GET /internal/n8n/health — diagnóstico completo ──────────────────────────

router.get("/internal/n8n/health", requireInternalKey, async (req: Request, res: Response) => {
  try {
    const { scope, tenant } = requireScopedRequest(req, "n8n_health");
    const [workflows, healths] = await Promise.all([
      listWorkflows(scope),
      checkN8nWorkflowHealth(),
    ]);
    const visibleIds = new Set(workflows.map(workflow => workflow.id));
    const scopedHealths = healths.filter(health => visibleIds.has(health.workflowId));

    const issues = scopedHealths.filter(h => h.consecutiveErrors >= 3 || h.likelyPlanLimit);
    const planLimitDetected = scopedHealths.filter(h => h.likelyPlanLimit).length >= 2;

    res.json({
      ok: true,
      scope,
      tenant,
      timestamp: new Date().toISOString(),
      summary: {
        totalScopedWorkflows: workflows.length,
        totalActiveWorkflowsChecked: scopedHealths.length,
        planLimitDetected,
        workflowsWithErrors: issues.length,
      },
      issues,
      all: scopedHealths,
    });
  } catch (err) {
    sendScopedError(res, err, "n8n_health");
  }
});

export default router;
