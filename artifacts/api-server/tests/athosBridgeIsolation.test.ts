import assert from "node:assert/strict";
import { dispatchAction, triggerWebhook } from "../src/routes/mentor/athosBridge";

const originalFetch = globalThis.fetch;
let unexpectedFetchCalls = 0;

async function expectRejected(
  operation: () => Promise<unknown>,
  pattern: RegExp,
): Promise<void> {
  await assert.rejects(operation, pattern);
}

async function run(): Promise<void> {
  globalThis.fetch = (async () => {
    unexpectedFetchCalls++;
    throw new Error("Unexpected external request in isolation test");
  }) as typeof fetch;

  try {
    await expectRejected(
      () => dispatchAction("list_n8n_workflows", { scope: "mirage" }),
      /tenant_id\/company_slug obrigatório/,
    );
    await expectRejected(
      () => dispatchAction("get_n8n_workflow", { scope: "mirage", tenant_id: "r2pb", workflow_id: "any-id" }),
      /não pertence ao escopo/,
    );
    await expectRejected(
      () => dispatchAction("create_n8n_workflow", {
        scope: "mirage",
        tenant_id: "mirage",
        workflow: { name: "R2PB_cross_tenant", nodes: [], connections: {} },
      }),
      /pertence ao escopo r2pb/,
    );
    await expectRejected(
      () => dispatchAction("create_n8n_workflow", {
        scope: "mirage",
        tenant_id: "mirage",
        workflow: { name: "MIRAGE_embedded_secret", nodes: [], connections: {}, credentials: "plaintext" },
      }),
      /segredo não pode ser embutido/,
    );
    await expectRejected(
      () => dispatchAction("list_n8n_credentials", {}),
      /desabilitado/,
    );
    await expectRejected(
      () => triggerWebhook("MIRAGE_publish", {}, "mirage"),
      /tenant_id\/company_slug obrigatório/,
    );
    assert.equal(unexpectedFetchCalls, 0, "Invalid n8n actions must not issue external requests");

    let validWebhookRequest: { url: string; body: Record<string, unknown> } | null = null;
    globalThis.fetch = (async (input, init) => {
      validWebhookRequest = {
        url: String(input),
        body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
      };
      return new Response(JSON.stringify({ accepted: true }), { status: 200 });
    }) as typeof fetch;

    const result = await dispatchAction("trigger_n8n_webhook", {
      scope: "mirage",
      tenant_id: "mirage",
      webhook_path: "MIRAGE_postfunnel",
      payload: { event: "test" },
    });
    assert.deepEqual(result, { accepted: true });
    assert.match(validWebhookRequest?.url ?? "", /\/webhook\/MIRAGE_postfunnel$/);
    assert.deepEqual(validWebhookRequest?.body, { event: "test", tenant_id: "mirage" });

    await expectRejected(
      () => dispatchAction("trigger_n8n_webhook", {
        scope: "mirage",
        tenant_id: "mirage",
        webhook_path: "MIRAGE_postfunnel",
        payload: { tenant_id: "r2pb" },
      }),
      /não pertence ao escopo/,
    );

    console.log("athosBridgeIsolation.test: all dispatcher isolation guards passed");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});