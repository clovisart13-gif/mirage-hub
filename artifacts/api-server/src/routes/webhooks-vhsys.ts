/**
 * webhooks-vhsys.ts
 * Recebe eventos do VHSys ERP → cria / atualiza pedidos no Kanban Mirage
 *
 * VHSys deve configurar:
 *   URL:    POST https://<<dominio>>/api/webhooks/vhsys/pedido
 *   Header: x-vhsys-token: <<VHSYS_WEBHOOK_TOKEN>>
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { pedidos, itens_pedido, contas_a_receber } from "@workspace/db";
import { eq, and, max, like } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Mapa token → tenantId
// O token deve ser gerado pelo Mirage e fornecido ao VHSys nas configurações de webhook
const WEBHOOK_TOKENS: Record<string, string> = {
  [process.env.VHSYS_WEBHOOK_TOKEN ?? ""]: "093a253e-9c1c-43f5-b988-a50df952d0cd",
};

function autenticarWebhook(req: Request, res: Response): string | null {
  const token = (req.headers["x-vhsys-token"] ?? "") as string;
  if (!token || !WEBHOOK_TOKENS[token]) {
    res.status(401).json({ error: "Token de webhook inválido" });
    return null;
  }
  return WEBHOOK_TOKENS[token] as string;
}

async function gerarNumeroPedido(tenantId: string): Promise<string> {
  const ano = new Date().getFullYear().toString().slice(-2);
  const prefix = `PED-${ano}-`;
  const result = await db
    .select({ maxNum: max(pedidos.numero_pedido) })
    .from(pedidos)
    .where(and(eq(pedidos.tenant_id, tenantId), like(pedidos.numero_pedido, `${prefix}%`)));
  const maxNum = result[0]?.maxNum;
  let seq = 1;
  if (maxNum) {
    const parts = maxNum.split("-");
    const lastSeq = parseInt(parts[parts.length - 1] ?? "0", 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

function parsearDataVhsys(data?: string | null): Date | null {
  if (!data) return null;
  // VHSys usa dd/MM/yyyy OU yyyy-MM-dd
  if (data.includes("/")) {
    const [d, m, y] = data.split("/");
    return new Date(`${y}-${m}-${d}T00:00:00`);
  }
  return new Date(data);
}

// ── POST /webhooks/vhsys/pedido ───────────────────────────────────────────
// Cria pedido no Kanban a partir de um evento do VHSys
router.post("/webhooks/vhsys/pedido", async (req: Request, res: Response) => {
  const tenantId = autenticarWebhook(req, res);
  if (!tenantId) return;

  const {
    evento,
    id_ped,
    id_pedido,
    id_cliente,
    nome_cliente,
    cnpj_cliente,
    data_pedido,
    prazo_entrega,
    valor_total_nota,
    obs_pedido,
    status_pedido,
    itens: itensVhsys = [],
  } = req.body;

  // Validação básica
  if (!id_ped && !id_pedido) {
    res.status(400).json({ error: "id_ped ou id_pedido é obrigatório" });
    return;
  }

  logger.info({ evento, id_ped, nome_cliente }, "Webhook VHSys recebido");

  // Verificar se pedido VHSys já existe no Kanban
  const refVhsys = String(id_ped ?? id_pedido);
  const [existente] = await db
    .select({ id: pedidos.id, numero_pedido: pedidos.numero_pedido })
    .from(pedidos)
    .where(
      and(
        eq(pedidos.tenant_id, tenantId),
        eq(pedidos.bling_id, refVhsys), // reutilizamos bling_id para guardar id_ped VHSys
      ),
    )
    .limit(1);

  if (existente) {
    logger.info({ id_ped, pedidoId: existente.id }, "Pedido VHSys já existe");
    res.json({
      success: true,
      message: `Pedido já existe no Kanban: ${existente.numero_pedido}`,
      pedido_id: existente.id,
      numero_pedido: existente.numero_pedido,
      duplicado: true,
    });
    return;
  }

  // Calcular valor
  const valorTotalReais = parseFloat(valor_total_nota ?? "0") || 0;
  const valorTotalCents = Math.round(valorTotalReais * 100);
  const prazoDate = parsearDataVhsys(prazo_entrega);

  // Gerar número de pedido
  const numeroPedido = await gerarNumeroPedido(tenantId);

  // Criar pedido
  const [novoPedido] = await db
    .insert(pedidos)
    .values({
      tenant_id: tenantId,
      numero: numeroPedido,
      numero_pedido: numeroPedido,
      nome_cliente: (nome_cliente ?? "").trim().toUpperCase() || "CLIENTE VHSYS",
      cnpj_cliente: cnpj_cliente ?? null,
      data_pedido: data_pedido ? parsearDataVhsys(data_pedido) ?? new Date() : new Date(),
      prazo_entrega: prazoDate,
      data_entrega_prevista: prazoDate,
      status: "pendente",
      valor_total: String(valorTotalReais.toFixed(2)),
      valor_total_cents: valorTotalCents,
      valor_sinal: "0.00",
      valor_sinal_cents: 0,
      observacoes: obs_pedido ?? null,
      origem: "vhsys",
      bling_id: refVhsys, // guarda id_ped do VHSys para deduplicação
      id_vhsys_cliente: id_cliente ? String(id_cliente) : null,
    })
    .returning();

  // Criar itens do pedido
  const itensList: any[] = Array.isArray(itensVhsys) ? itensVhsys : [];
  if (itensList.length > 0) {
    await db.insert(itens_pedido).values(
      itensList.map((item: any) => ({
        tenant_id: tenantId,
        pedido_id: novoPedido.id,
        referencia: item.cod_produto ?? "",
        descricao: item.desc_produto ?? "",
        quantidade_total: parseInt(item.quantidade ?? "0", 10),
        quantidade_por_tamanho: {},
        valor_unitario: Math.round(parseFloat(item.valor_unitario ?? "0") * 100),
        cmp: 0,
      })),
    );
  }

  // Gerar conta a receber
  if (valorTotalCents > 0) {
    await db.insert(contas_a_receber).values({
      tenant_id: tenantId,
      descricao: `Pedido ${numeroPedido} (VHSys #${refVhsys}) — ${novoPedido.nome_cliente}`,
      valor: String(valorTotalReais.toFixed(2)),
      data_vencimento: prazoDate,
      status: "pendente",
    });
  }

  logger.info({ numeroPedido, tenantId, id_ped }, "Pedido VHSys importado com sucesso");

  res.status(201).json({
    success: true,
    message: `Pedido ${numeroPedido} criado no Kanban a partir do VHSys`,
    pedido_id: novoPedido.id,
    numero_pedido: numeroPedido,
  });
});

// ── GET /webhooks/vhsys/status ─────────────────────────────────────────────
// VHSys pode usar para verificar se o endpoint está ativo
router.get("/webhooks/vhsys/status", (_req: Request, res: Response) => {
  res.json({
    status: "online",
    servico: "Mirage Hub Kanban",
    versao: "1.0",
    timestamp: new Date().toISOString(),
    eventos_suportados: ["pedido.criado", "pedido.atualizado", "pedido.cancelado"],
  });
});

export default router;
