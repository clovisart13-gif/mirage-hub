/**
 * Agendador de importação bancária automática
 * Roda todo dia às 06h00 horário de Brasília (09h00 UTC)
 * Suporta: Banco Inter (mTLS) e Pluggy (Open Finance)
 */
import { db } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { finTransacoes, finRegrasClassificacao } from "@workspace/db";
import { logger } from "../lib/logger";

interface ConexaoBanco {
  id: number;
  tenant_id: string;
  nome: string;
  banco: string;
  tipo_auth: string;
  client_id: string;
  client_secret: string;
  cert_crt: string | null;
  cert_key: string | null;
  pluggy_item_id: string | null;
  pluggy_account_ids: string | null;
  conta_id: number | null;
  ativo: boolean;
  ultimo_import: string | null;
}

async function salvarTransacoesScheduler(
  tenantId: string,
  contaId: number | undefined,
  transacoes: { data: string; descricao: string; valor: number; tipo: "CREDITO" | "DEBITO"; fitId: string }[],
  regras: (typeof finRegrasClassificacao.$inferSelect)[],
): Promise<{ importadas: number; duplicadas: number }> {
  if (transacoes.length === 0) return { importadas: 0, duplicadas: 0 };

  const fitIds = transacoes.map(t => t.fitId);
  const existentes = await db.execute(
    sql`SELECT origem_id FROM fin_transacoes WHERE tenant_id = ${tenantId} AND origem_tipo = 'ofx' AND origem_id = ANY(${fitIds})`
  );
  const jaExistem  = new Set(existentes.rows.map((r: any) => r.origem_id));
  const novas      = transacoes.filter(t => !jaExistem.has(t.fitId));
  const duplicadas = transacoes.length - novas.length;

  if (novas.length > 0) {
    await db.insert(finTransacoes).values(
      novas.map(t => {
        const regra = regras.find(r => t.descricao.toUpperCase().includes(r.termo.toUpperCase()));
        return {
          tenantId, contaId,
          data: t.data, descricao: t.descricao,
          valor: String(t.valor), tipo: t.tipo,
          categoriaId: regra?.categoriaId,
          natureza:    regra?.natureza,
          centroCusto: regra?.centroCusto,
          status:      regra ? "classificado" as const : "pendente" as const,
          origemTipo:  "ofx",
          origemId:    t.fitId,
        };
      })
    );
  }
  return { importadas: novas.length, duplicadas };
}

async function importarInter(conn: ConexaoBanco): Promise<{ importadas: number; duplicadas: number }> {
  const { fetchInterExtrato, interToOFX } = await import("./interBank.js");

  const agora    = new Date();
  const inicio   = conn.ultimo_import ? new Date(conn.ultimo_import) : new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dataInicio = inicio.toISOString().split("T")[0];
  const dataFim    = agora.toISOString().split("T")[0];

  const rawTxs = await fetchInterExtrato(
    { clientId: conn.client_id, clientSecret: conn.client_secret, certCrt: conn.cert_crt!, certKey: conn.cert_key! },
    dataInicio, dataFim,
  );

  const regras = await db.select().from(finRegrasClassificacao).where(eq(finRegrasClassificacao.tenantId, conn.tenant_id));
  return salvarTransacoesScheduler(conn.tenant_id, conn.conta_id ?? undefined, rawTxs.map(interToOFX), regras);
}

async function importarPluggy(conn: ConexaoBanco): Promise<{ importadas: number; duplicadas: number }> {
  const { getPluggyTransactions, pluggyToOFX } = await import("./pluggyBank.js");

  const agora    = new Date();
  const inicio   = conn.ultimo_import ? new Date(conn.ultimo_import) : new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dataInicio = inicio.toISOString().split("T")[0];
  const dataFim    = agora.toISOString().split("T")[0];

  const accountIds = conn.pluggy_account_ids?.split(",").filter(Boolean) ?? [];
  if (accountIds.length === 0) {
    logger.warn({ msg: `Pluggy sem contas selecionadas: ${conn.nome}` });
    return { importadas: 0, duplicadas: 0 };
  }

  let todas: { data: string; descricao: string; valor: number; tipo: "CREDITO" | "DEBITO"; fitId: string }[] = [];
  for (const accId of accountIds) {
    const txs = await getPluggyTransactions(conn.client_id, conn.client_secret, accId, dataInicio, dataFim);
    todas = todas.concat(txs.map(t => pluggyToOFX(t, conn.banco)));
  }

  const regras = await db.select().from(finRegrasClassificacao).where(eq(finRegrasClassificacao.tenantId, conn.tenant_id));
  return salvarTransacoesScheduler(conn.tenant_id, conn.conta_id ?? undefined, todas, regras);
}

async function runScheduledImports() {
  logger.info({ msg: "🏦 Iniciando importação automática de bancos" });

  const result = await db.execute(sql`SELECT * FROM fin_conexoes_banco WHERE ativo = true`);
  const conexoes = result.rows as ConexaoBanco[];

  if (conexoes.length === 0) { logger.info({ msg: "Nenhuma conexão bancária ativa" }); return; }

  for (const conn of conexoes) {
    try {
      let res: { importadas: number; duplicadas: number };

      if (conn.tipo_auth === "pluggy") {
        if (!conn.client_id || !conn.client_secret || !conn.pluggy_item_id) {
          logger.warn({ msg: `Pluggy sem credenciais completas: ${conn.nome}` }); continue;
        }
        res = await importarPluggy(conn);
      } else {
        if (!conn.cert_crt || !conn.cert_key || !conn.client_id || !conn.client_secret) {
          logger.warn({ msg: `Inter sem credenciais completas: ${conn.nome}` }); continue;
        }
        res = await importarInter(conn);
      }

      await db.execute(sql`UPDATE fin_conexoes_banco SET ultimo_import = NOW() WHERE id = ${conn.id}`);
      logger.info({ msg: `✅ ${conn.nome}: ${res.importadas} importadas, ${res.duplicadas} duplicadas` });
    } catch (err: any) {
      logger.error({ msg: `❌ Erro ao importar ${conn.nome}`, error: err.message });
    }
  }
}

export function startBankImportScheduler() {
  logger.info({ msg: "📅 Agendador de importação bancária iniciado (diário 06h BRT)" });

  let lastRunDate = "";
  setInterval(async () => {
    const now = new Date();
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const hh  = brt.getUTCHours();
    const mm  = brt.getUTCMinutes();
    const dateKey = brt.toISOString().split("T")[0];

    if (hh === 6 && mm === 0 && dateKey !== lastRunDate) {
      lastRunDate = dateKey;
      runScheduledImports().catch(e => logger.error({ msg: "Erro no scheduler bancário", error: e.message }));
    }
  }, 60_000);
}
