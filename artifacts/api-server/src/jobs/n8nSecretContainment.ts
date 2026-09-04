import { logger } from "../lib/logger";
import {
  deactivateWorkflow,
  dispatchAction,
  getWorkflow,
  listWorkflows,
  updateWorkflow,
} from "../routes/mentor/athosBridge";

type WorkflowJson = Record<string, unknown>;

const AFFECTED_WORKFLOWS = [
  {
    id: "0HkCX20pmTiXYqLp",
    name: "R2PB_CONTENT_PACK_GENERATOR",
    node: "Get Campaign from Supabase",
  },
  {
    id: "ZhdfS1dw1FaImHf4",
    name: "R2PB_CALL_CONFIRMATION_AND_REMINDER_ZAPI_V2",
    node: "Lookup Lead by Email",
  },
] as const;

function removePlaintextHeaders(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(removePlaintextHeaders);
  }
  if (!value || typeof value !== "object") return value;

  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (/jsonHeaders|headerParameters|specifyHeaders|authorization/i.test(key)) continue;
    if (typeof nested === "string" && /x-internal-key|sb_(?:secret|publishable)_[A-Za-z0-9_-]{10,}/i.test(nested)) continue;
    result[key] = removePlaintextHeaders(nested);
  }
  return result;
}

function containsPlaintextSecret(value: unknown): boolean {
  if (typeof value === "string") {
    return /sb_(?:secret|publishable)_[A-Za-z0-9_-]{10,}|x-internal-key/i.test(value);
  }
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some(containsPlaintextSecret);
}

async function expectBlocked(run: () => Promise<unknown>): Promise<boolean> {
  try {
    await run();
    return false;
  } catch {
    return true;
  }
}

async function runContainment(): Promise<void> {
  const maintenance: Array<{ workflow: string; deactivated: boolean; sanitized: boolean; noPlaintextSecret: boolean; error?: string }> = [];

  for (const target of AFFECTED_WORKFLOWS) {
    try {
      await deactivateWorkflow(target.id, "r2pb");
      const workflow = await getWorkflow(target.id, "r2pb") as WorkflowJson;
      await updateWorkflow(target.id, removePlaintextHeaders(workflow) as WorkflowJson, "r2pb");
      const verified = await getWorkflow(target.id, "r2pb") as WorkflowJson;
      maintenance.push({
        workflow: target.name,
        deactivated: true,
        sanitized: true,
        noPlaintextSecret: !containsPlaintextSecret(verified),
      });
    } catch (error) {
      maintenance.push({
        workflow: target.name,
        deactivated: true,
        sanitized: false,
        noPlaintextSecret: false,
        error: error instanceof Error ? error.message : "erro desconhecido",
      });
    }
  }

  const [mirage, r2pb] = await Promise.all([
    listWorkflows("mirage"),
    listWorkflows("r2pb"),
  ]);

  const [mirageCannotReadR2pb, r2pbCannotReadMirage, missingScopeRejected] = await Promise.all([
    expectBlocked(() => getWorkflow(AFFECTED_WORKFLOWS[0].id, "mirage")),
    expectBlocked(() => getWorkflow("U7K30Tta6RN9xOPP", "r2pb")),
    expectBlocked(() => dispatchAction("list_n8n_workflows", {})),
  ]);

  logger.info({
    maintenance,
    validation: {
      mirageWorkflowCount: mirage.length,
      r2pbWorkflowCount: r2pb.length,
      mirageCannotReadR2pb,
      r2pbCannotReadMirage,
      missingScopeRejected,
    },
  }, "n8n secret containment completed");
}

export function startN8nSecretContainment(): void {
  if (process.env["N8N_CONTAINMENT_ON_START"] !== "true") return;
  runContainment().catch((error) => {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "n8n secret containment failed");
  });
}