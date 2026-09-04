import app from "./app";
import { logger } from "./lib/logger";
import { supabaseAdmin } from "./lib/supabase";
import { startBankImportScheduler } from "./services/bankScheduler";
import { runMigrationIfNeeded, seedContentPackIfNeeded, seedCampaignAssetsIfNeeded, createCampaignAssetsTableIfNeeded, createCampaignPublicationsTableIfNeeded, createCampaignMetricsTableIfNeeded, seedBrandBlueprintsIfNeeded, createHelenaTableIfNeeded, seedHelenaHistoricoIfNeeded, fixCmoHistoricoIfNeeded, addAviamentoColumnsIfNeeded, fixDuplicatePedidoNumbers, fixDuplicateOrcamentoNumbers, syncPedidoNumbersToOrcamentos, syncNumeroPedidoEmRelacionados, fixCmoHerdadoEntresFases, addMentorMessageMediaColumns, createLeadsEspelhoTableIfNeeded, createComercialLeadsTableIfNeeded, createSalesAutomationConfigTableIfNeeded, seedGrowthAssetsIfNeeded, createLeadAiEventsTableIfNeeded, createLeadJourneyTablesIfNeeded, createParceirosTablesIfNeeded, createAgentHandoffsTableIfNeeded, seedGrowthCampaignsIfNeeded, addGrowthAssetsPublishColumnsIfNeeded, createGrowthCampaignSlotsIfNeeded, addPlmProdutosClienteIdIfNeeded, addPlmProdutosReferenciaClienteIfNeeded, addPlmCommercialTraceabilityIfNeeded, addPlmPilotagemWorkflowIfNeeded, createMarketingPromptSettingsIfNeeded, addHubAccessTokenToPreCadastros, addTenantIsolationColumnsIfNeeded, dropDangerousColumnDefaultsIfNeeded, createTexintelTablesIfNeeded, createAtosTaskEventsIfNeeded, migrateReplitHandoffStatusIfNeeded, createAthosMemoryTablesIfNeeded, seedAthosStrategicMemoryIfNeeded, createFormTokensTableIfNeeded, createBillingPaymentConfirmationsTableIfNeeded, addWhatsappToConfiguracoesEmpresaIfNeeded, createKanbanPreAgendamentosTablesIfNeeded } from "./migrate";
import { ensureOperationalEventsTable } from "./routes/operational-events";
import { startBackupScheduler } from "./lib/dbBackup";
import { startHelenaWebhookMonitor } from "./jobs/helenaWebhookMonitor";
import { startAgentExecutor } from "./jobs/agentExecutor";
import { startN8nHealthMonitor } from "./jobs/n8nHealthMonitor";
import { startN8nSecretContainment } from "./jobs/n8nSecretContainment";
import { startTexintelPipeline } from "./workers/texintel-pipeline";

// Verificar schema do banco na inicialização
async function checkSchema() {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id, name, plan, assinatura_status, assinatura_expira_em, usuarios_extras, canais_extras")
    .limit(1);

  if (error) {
    logger.error({ msg: "❌ SCHEMA ERROR - colunas faltando na tabela tenants:", error: error.message });
    logger.error({ msg: "▶ Execute este SQL no Supabase Dashboard (SQL Editor):", sql: `
-- Colunas de assinatura e extras na tabela tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS assinatura_status TEXT DEFAULT 'trial';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS assinatura_expira_em DATE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS usuarios_extras INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS canais_extras INTEGER DEFAULT 0;

-- Tabela de apps ativos por tenant
CREATE TABLE IF NOT EXISTS tenant_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  app_key TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  ativo_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, app_key)
);

-- Tabela de assinaturas de módulos avulsos e extras
CREATE TABLE IF NOT EXISTS addon_subscriptions (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('modulo', 'extra')),
  item_id TEXT NOT NULL,
  app_key TEXT,
  quantidade INTEGER DEFAULT 1,
  periodicidade TEXT DEFAULT 'mensal',
  preco_mensal NUMERIC(10,2) NOT NULL,
  implantacao_pago BOOLEAN DEFAULT FALSE,
  asaas_subscription_id TEXT,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, tipo, item_id)
);

-- Fila de provisionamento ERP/CRM
CREATE TABLE IF NOT EXISTS provisioning_queue (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  app TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  tenant_name TEXT,
  tenant_email TEXT,
  plan TEXT,
  expira_em TEXT,
  external_id TEXT,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);` });
  } else {
    logger.info({ msg: "✅ Schema OK - todas as colunas existem", count: data?.length });

    // Verificar addon_subscriptions (silencioso)
    await supabaseAdmin.from("addon_subscriptions" as any).select("id").limit(1).then(() => {}).catch(() => {});
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ── Notificação de deploy via WhatsApp — DESATIVADA a pedido do usuário ──────

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  checkSchema().catch(e => logger.error({ msg: "Falha no checkSchema", error: e.message }));
  runMigrationIfNeeded().catch(e => logger.error({ msg: "Falha na migração", error: e.message }));
  seedContentPackIfNeeded().catch(e => logger.error({ msg: "Falha no seed content_pack", error: e.message }));
  seedBrandBlueprintsIfNeeded().catch(e => logger.error({ msg: "Falha no seed brand_blueprints", error: e.message }));
  createCampaignAssetsTableIfNeeded()
    .then(() => seedCampaignAssetsIfNeeded())
    .catch(e => logger.error({ msg: "Falha ao criar/seed campaign_assets", error: e.message }));
  createCampaignPublicationsTableIfNeeded().catch(e => logger.error({ msg: "Falha ao criar tabela campaign_publications", error: e.message }));
  createCampaignMetricsTableIfNeeded().catch(e => logger.error({ msg: "Falha ao criar tabela campaign_metrics", error: e.message }));
  createHelenaTableIfNeeded()
    .then(() => seedHelenaHistoricoIfNeeded())
    .catch(e => logger.error({ msg: "Falha ao criar/seed tabela helena_card_migrations", error: e.message }));
  ensureOperationalEventsTable().catch(e => logger.error({ msg: "Falha ao criar tabela operational_events", error: e.message }));
  fixCmoHistoricoIfNeeded().catch(e => logger.error({ msg: "Falha ao corrigir CMO histórico", error: e.message }));
  addAviamentoColumnsIfNeeded().catch(e => logger.error({ msg: "Falha ao adicionar colunas aviamento", error: e.message }));
  createLeadsEspelhoTableIfNeeded().catch(e => logger.error({ msg: "Falha ao criar tabela leads_espelho", error: e.message }));
  createComercialLeadsTableIfNeeded().catch(e => logger.error({ msg: "Falha ao criar tabela comercial_leads", error: e.message }));
  createSalesAutomationConfigTableIfNeeded().catch(e => logger.error({ msg: "Falha ao criar tabela sales_automation_config", error: e.message }));
  fixDuplicatePedidoNumbers().catch(e => logger.error({ msg: "Falha ao corrigir pedidos duplicados", error: e.message }));
  fixCmoHerdadoEntresFases().catch(e => logger.error({ msg: "Falha ao corrigir CMO herdado entre fases", error: e.message }));
  addMentorMessageMediaColumns().catch(e => logger.error({ msg: "Falha ao adicionar colunas de mídia no mentor_messages", error: e.message }));
  fixDuplicateOrcamentoNumbers()
    .then(() => syncPedidoNumbersToOrcamentos())
    .then(() => syncNumeroPedidoEmRelacionados())
    .catch(e => logger.error({ msg: "Falha ao corrigir/sincronizar orçamentos, pedidos e referências", error: e.message }));
  createLeadAiEventsTableIfNeeded().catch(e => logger.error({ msg: "Falha ao criar tabela lead_ai_events", error: e.message }));
  createLeadJourneyTablesIfNeeded().catch(e => logger.error({ msg: "Falha ao criar tabelas lead_journey", error: e.message }));
  createParceirosTablesIfNeeded().catch(e => logger.error({ msg: "Falha ao criar tabelas parceiros/candidatos", error: e.message }));
  seedGrowthAssetsIfNeeded().catch(e => logger.error({ msg: "Falha ao seed growth_assets", error: e.message }));
  createAgentHandoffsTableIfNeeded().catch(e => logger.error({ msg: "Falha ao criar tabela agent_handoffs", error: e.message }));
  seedGrowthCampaignsIfNeeded().catch(e => logger.error({ msg: "Falha ao seed growth_campaigns", error: e.message }));
  addGrowthAssetsPublishColumnsIfNeeded().catch(e => logger.error({ msg: "Falha ao adicionar colunas de publicação em growth_assets", error: e.message }));
  createGrowthCampaignSlotsIfNeeded().catch(e => logger.error({ msg: "Falha ao criar growth_campaign_slots", error: e.message }));
  createMarketingPromptSettingsIfNeeded().catch(e => logger.error({ msg: "Falha ao criar marketing_prompt_settings", error: e.message }));
  addPlmProdutosClienteIdIfNeeded().catch(e => logger.error({ msg: "Falha ao adicionar cliente_id em plm_produtos", error: e.message }));
  addPlmProdutosReferenciaClienteIfNeeded().catch(e => logger.error({ msg: "Falha ao adicionar referencia_cliente em plm_produtos", error: e.message }));
  addPlmCommercialTraceabilityIfNeeded().catch(e => logger.error({ msg: "Falha ao criar rastreabilidade PLM/comercial", error: e.message }));
  addPlmPilotagemWorkflowIfNeeded().catch(e => logger.error({ msg: "Falha ao preparar fluxo de pilotagem PLM", error: e.message }));
  addHubAccessTokenToPreCadastros().catch(e => logger.error({ msg: "Falha ao adicionar hub_access_token", error: e.message }));
  addTenantIsolationColumnsIfNeeded().catch(e => logger.error({ msg: "Falha em addTenantIsolationColumnsIfNeeded", error: e.message }));
  dropDangerousColumnDefaultsIfNeeded().catch(e => logger.error({ msg: "Falha em dropDangerousColumnDefaultsIfNeeded", error: e.message }));
  createTexintelTablesIfNeeded().catch(e => logger.error({ msg: "Falha em createTexintelTablesIfNeeded", error: e.message }));
  createAtosTaskEventsIfNeeded().catch(e => logger.error({ msg: "Falha em createAtosTaskEventsIfNeeded", error: e.message }));
  migrateReplitHandoffStatusIfNeeded().catch(e => logger.error({ msg: "Falha em migrateReplitHandoffStatusIfNeeded", error: e.message }));
  createAthosMemoryTablesIfNeeded()
    .then(() => seedAthosStrategicMemoryIfNeeded())
    .catch(e => logger.error({ msg: "Falha em ATHOS Memory init", error: e.message }));
  createFormTokensTableIfNeeded().catch(e => logger.error({ msg: "Falha em createFormTokensTableIfNeeded", error: e.message }));
  createBillingPaymentConfirmationsTableIfNeeded().catch(e => logger.error({ msg: "Falha em createBillingPaymentConfirmationsTableIfNeeded", error: e.message }));
  addWhatsappToConfiguracoesEmpresaIfNeeded().catch(e => logger.error({ msg: "Falha em addWhatsappToConfiguracoesEmpresaIfNeeded", error: e.message }));
  createKanbanPreAgendamentosTablesIfNeeded().catch(e => logger.error({ msg: "Falha em createKanbanPreAgendamentosTablesIfNeeded", error: e.message }));
  startBackupScheduler();
  startBankImportScheduler();
  startHelenaWebhookMonitor();
  startAgentExecutor();
  startN8nHealthMonitor();
  startN8nSecretContainment();
  startTexintelPipeline();

});
// autoRegisterZapiWebhook desativado — sobrescrevia o webhook Helena do Z-API a cada restart.

async function autoRegisterZapiWebhook() {
  // ⚠️ Credenciais devem vir de env vars do canal admin — nunca hardcoded.
  // Configurar ZAPI_INSTANCE_R2PB + ZAPI_TOKEN_R2PB nos secrets para reativar esta função.
  const INSTANCE_ID = process.env["ZAPI_INSTANCE_R2PB"] ?? "";
  const INSTANCE_TOKEN = process.env["ZAPI_TOKEN_R2PB"] ?? "";
  const TENANT_SLUG = "r2pb"; // ✅ VÁLIDO: esta função registra o webhook exclusivo da R2PB

  const domain = (process.env["REPLIT_DOMAINS"] ?? "").split(",")[0].trim();
  if (!domain) {
    logger.warn("autoRegisterZapiWebhook: REPLIT_DOMAINS não definido, pulando");
    return;
  }

  const webhookUrl = `https://${domain}/api/zapi/callback?tenant=${TENANT_SLUG}`;
  const zapiUrl = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${INSTANCE_TOKEN}/update-webhook-received`;

  const res = await fetch(zapiUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: webhookUrl }),
    signal: AbortSignal.timeout(10_000),
  });

  const body = await res.json().catch(() => null) as Record<string, unknown> | null;

  if (res.ok && body?.value === true) {
    logger.info({ webhookUrl }, "✅ Z-API webhook auto-registrado com sucesso");
  } else {
    logger.warn({ webhookUrl, status: res.status, body }, "⚠️ Z-API webhook auto-registro retornou resposta inesperada");
  }
}
