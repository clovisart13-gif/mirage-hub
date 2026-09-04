import assert from "node:assert/strict";
import {
  assertTenantScope,
  assertWorkflowScope,
  requireWorkflowScope,
  requireWorkflowTenantScope,
} from "../src/lib/workflowScope";

function expectRejected(fn: () => void, pattern: RegExp): void {
  assert.throws(fn, pattern);
}

assert.equal(requireWorkflowScope({ scope: "mirage" }, "test"), "mirage");
expectRejected(() => requireWorkflowScope({ workflow_scope: "moda_conecta" }, "test"), /scope obrigatório/);
expectRejected(() => requireWorkflowScope({}, "test"), /scope obrigatório/);

expectRejected(() => assertTenantScope("r2pb", "mirage", "test"), /não pertence ao escopo/);
expectRejected(() => assertTenantScope(undefined, "r2pb", "test"), /tenant_id\/company_slug obrigatório/);
assert.deepEqual(
  requireWorkflowTenantScope({ scope: "mirage", tenant_id: "mirage" }, "test"),
  { scope: "mirage", tenant: "mirage" },
);
assert.deepEqual(
  requireWorkflowTenantScope({ scope: "platform" }, "test"),
  { scope: "platform", tenant: undefined },
);
expectRejected(
  () => requireWorkflowTenantScope({ scope: "mirage" }, "test"),
  /tenant_id\/company_slug obrigatório/,
);
expectRejected(
  () => requireWorkflowTenantScope({ scope: "mirage", tenant_id: "r2pb" }, "test"),
  /não pertence ao escopo/,
);
expectRejected(
  () => requireWorkflowTenantScope({ scope: "platform", tenant_id: "mirage" }, "test"),
  /platform não aceita tenant_id\/company_slug/,
);

assertWorkflowScope("MIRAGE_instagram_publish", "mirage");
expectRejected(() => assertWorkflowScope("R2PB_lead_rescue", "mirage"), /pertence ao escopo r2pb/);
expectRejected(() => assertWorkflowScope("MIRAGE_instagram_publish", "r2pb"), /pertence ao escopo mirage/);
expectRejected(() => assertWorkflowScope("instagram-publish", "mirage"), /não tem prefixo de escopo válido/);

console.log("workflowScope.test: all isolation guards passed");