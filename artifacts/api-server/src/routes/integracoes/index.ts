import { Router } from "express";
import { requireAuth, requireTenantAccess, type AuthenticatedRequest } from "../../middlewares/auth";
import { db } from "@workspace/db";
import { tenantIntegracoes } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../../lib/logger";

const router = Router();

// ─── Catálogo de integrações disponíveis ──────────────────────────────────────

const CATALOGO = [
  {
    chave: "asaas",
    nome: "Asaas",
    categoria: "Cobrança + NFS-e",
    descricao:
      "Receba pagamentos por PIX, boleto e cartão. Emita NFS-e (Nota Fiscal de Serviços) automaticamente para suas cobranças.",
    icon: "zap",
    cor: "blue",
    campos: [
      { key: "api_key", label: "Chave de API", tipo: "password", placeholder: "$aas_..." },
    ],
    ambientes: ["sandbox", "producao"],
    docs: "https://asaasv3.docs.apiary.io",
    custo: "Gratuito — cobra só sobre transações (PIX 0,99%, Boleto R$2,39)",
    status: "disponivel",
  },
  {
    chave: "focusnfe",
    nome: "Focus NFe",
    categoria: "NF-e de Produto",
    descricao:
      "Emita NF-e (Nota Fiscal Eletrônica de produto) para suas vendas. Ideal para confecções que vendem produtos físicos.",
    icon: "file-text",
    cor: "green",
    campos: [
      { key: "api_key", label: "Token de API", tipo: "password", placeholder: "Token gerado no painel Focus NFe" },
      { key: "cnpj_emitente", label: "CNPJ do Emitente", tipo: "text", placeholder: "00.000.000/0001-00" },
    ],
    ambientes: ["homologacao", "producao"],
    docs: "https://focusnfe.com.br/documentacao",
    custo: "Aprox. R$0,30 por NF emitida — sem mensalidade mínima",
    status: "disponivel",
  },
  {
    chave: "plugnotas",
    nome: "PlugNotas",
    categoria: "NF-e / NFS-e",
    descricao:
      "Plataforma completa para emissão de NF-e, NFS-e e NFC-e. Boa opção para quem precisa dos três tipos em um só lugar.",
    icon: "plug",
    cor: "purple",
    campos: [
      { key: "api_key", label: "Chave de API", tipo: "password", placeholder: "Gerada no painel PlugNotas" },
    ],
    ambientes: ["sandbox", "producao"],
    docs: "https://plugnotas.com.br/documentacao",
    custo: "A partir de R$29/mês",
    status: "em_breve",
  },
  {
    chave: "gptmarker",
    nome: "GPTMarker",
    categoria: "Marketing com IA",
    descricao:
      "Geração de conteúdo e automação de marketing com inteligência artificial. Cole sua chave de API para integrar ao fluxo de campanhas.",
    icon: "zap",
    cor: "purple",
    campos: [
      { key: "api_key", label: "Chave de API", tipo: "password", placeholder: "Cole aqui sua API Key do GPTMarker" },
    ],
    ambientes: ["producao"],
    docs: "https://gptmarker.com",
    custo: "Conforme plano contratado",
    status: "disponivel",
  },
];

// ─── GET /api/integracoes — listar integrações do tenant com status ────────────

router.get(
  "/integracoes",
  requireAuth,
  requireTenantAccess,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.tenantId!;

    const salvas = await db
      .select()
      .from(tenantIntegracoes)
      .where(eq(tenantIntegracoes.tenantId, tenantId));

    const resultado = CATALOGO.map((integ) => {
      const salva = salvas.find((s) => s.chave === integ.chave);
      return {
        ...integ,
        configurada: !!salva,
        ativa: salva?.ativo ?? false,
        ambiente: salva?.ambiente ?? integ.ambientes[0],
        config: salva?.config ? (() => { try { return JSON.parse(salva.config!); } catch { return {}; } })() : {},
        testedAt: salva?.testedAt ?? null,
      };
    });

    res.json({ integracoes: resultado });
  },
);

// ─── PUT /api/integracoes/:chave — salvar / atualizar credenciais ──────────────

router.put(
  "/integracoes/:chave",
  requireAuth,
  requireTenantAccess,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.tenantId!;
    const { chave } = req.params;
    const { api_key, ambiente, config = {} } = req.body;

    const catalogo = CATALOGO.find((c) => c.chave === chave);
    if (!catalogo) { res.status(404).json({ error: "Integração não encontrada" }); return; }

    await db
      .insert(tenantIntegracoes)
      .values({
        tenantId,
        chave,
        apiKey: api_key || null,
        ambiente: ambiente || catalogo.ambientes[0],
        config: JSON.stringify(config),
        ativo: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [tenantIntegracoes.tenantId, tenantIntegracoes.chave],
        set: {
          apiKey: api_key || null,
          ambiente: ambiente || catalogo.ambientes[0],
          config: JSON.stringify(config),
          ativo: true,
          updatedAt: new Date(),
        },
      });

    logger.info({ event: "integracao_salva", tenantId, chave }, "Integração salva");
    res.json({ ok: true, chave });
  },
);

// ─── DELETE /api/integracoes/:chave — remover credenciais ────────────────────

router.delete(
  "/integracoes/:chave",
  requireAuth,
  requireTenantAccess,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.tenantId!;
    const { chave } = req.params;

    await db
      .delete(tenantIntegracoes)
      .where(
        and(
          eq(tenantIntegracoes.tenantId, tenantId),
          eq(tenantIntegracoes.chave, chave),
        ),
      );

    logger.info({ event: "integracao_removida", tenantId, chave }, "Integração removida");
    res.json({ ok: true });
  },
);

// ─── POST /api/integracoes/:chave/testar — testar conexão com o provedor ─────

router.post(
  "/integracoes/:chave/testar",
  requireAuth,
  requireTenantAccess,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.tenantId!;
    const { chave } = req.params;

    const salva = await db
      .select()
      .from(tenantIntegracoes)
      .where(
        and(
          eq(tenantIntegracoes.tenantId, tenantId),
          eq(tenantIntegracoes.chave, chave),
        ),
      )
      .then((r) => r[0]);

    if (!salva?.apiKey) {
      res.status(400).json({ ok: false, mensagem: "Credenciais não configuradas" });
      return;
    }

    try {
      if (chave === "asaas") {
        const base =
          salva.ambiente === "producao"
            ? "https://api.asaas.com/api/v3"
            : "https://sandbox.asaas.com/api/v3";
        const resp = await fetch(`${base}/myAccount`, {
          headers: { access_token: salva.apiKey },
        });
        if (!resp.ok) { res.json({ ok: false, mensagem: `Asaas retornou ${resp.status}` }); return; }
        const data: any = await resp.json();
        await db
          .update(tenantIntegracoes)
          .set({ testedAt: new Date() })
          .where(and(eq(tenantIntegracoes.tenantId, tenantId), eq(tenantIntegracoes.chave, chave)));
        res.json({ ok: true, mensagem: `Conectado como ${data.name ?? "conta Asaas"}` });
        return;
      }

      if (chave === "focusnfe") {
        const config = salva.config ? JSON.parse(salva.config) : {};
        const cnpj = (config.cnpj_emitente || "").replace(/\D/g, "");
        if (!cnpj) { res.json({ ok: false, mensagem: "CNPJ do emitente não informado" }); return; }
        const base =
          salva.ambiente === "producao"
            ? "https://api.focusnfe.com.br"
            : "https://homologacao.focusnfe.com.br";
        const resp = await fetch(`${base}/v2/informacoes_empresas/${cnpj}`, {
          headers: { Authorization: "Basic " + Buffer.from(salva.apiKey + ":").toString("base64") },
        });
        if (!resp.ok) { res.json({ ok: false, mensagem: `Focus NFe retornou ${resp.status} — verifique o CNPJ e o token` }); return; }
        await db
          .update(tenantIntegracoes)
          .set({ testedAt: new Date() })
          .where(and(eq(tenantIntegracoes.tenantId, tenantId), eq(tenantIntegracoes.chave, chave)));
        res.json({ ok: true, mensagem: "Credenciais Focus NFe válidas" });
        return;
      }

      res.json({ ok: false, mensagem: "Teste automático não disponível para esta integração ainda" });
    } catch (err: any) {
      logger.warn({ err: err.message, tenantId, chave }, "Erro ao testar integração");
      res.json({ ok: false, mensagem: "Erro de conexão — verifique suas credenciais" });
    }
  },
);

export default router;
