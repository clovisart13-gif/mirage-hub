import { db } from "@workspace/db";
import {
  clientes,
  fichas_custo,
  itens_orcamento_custos,
  itens_pedido,
  plm_produtos,
  referencias,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

type ApprovedItem = {
  item_id: string;
  ficha_id: string | null;
  old_produto_id: number | null;
  ficha_old_produto_id: number | null;
  referencia_orcamento: string | null;
  descricao: string;
  familia: string | null;
  orcamento_numero: string;
  cliente_id: string | null;
  nome_cliente: string;
};

function normalizeKey(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function tenantPrefix(tenantId: string) {
  return tenantId.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase().padEnd(4, "X");
}

async function nextTechnicalReference(executor: any, tenantId: string) {
  const result = await executor.execute(sql`
    INSERT INTO plm_sequencias (tenant_id, prefixo, ultimo_numero)
    VALUES (${tenantId}, 'TECH', 1)
    ON CONFLICT (tenant_id, prefixo)
    DO UPDATE SET ultimo_numero = plm_sequencias.ultimo_numero + 1
    RETURNING ultimo_numero
  `);
  const number = Number((result.rows[0] as any).ultimo_numero);
  return `${tenantPrefix(tenantId)}-${String(number).padStart(4, "0")}`;
}

async function resolveCentralClient(executor: any, tenantId: string, item: ApprovedItem) {
  if (item.cliente_id) {
    const [byId] = await executor.select({ id: clientes.id }).from(clientes)
      .where(and(eq(clientes.id, item.cliente_id), eq(clientes.tenant_id, tenantId)))
      .limit(1);
    if (byId) return byId.id;
  }

  const normalizedName = item.nome_cliente.trim();
  const [byName] = await executor.select({ id: clientes.id }).from(clientes)
    .where(and(
      eq(clientes.tenant_id, tenantId),
      sql`LOWER(BTRIM(${clientes.nome})) = LOWER(BTRIM(${normalizedName}))`,
    ))
    .orderBy(sql`${clientes.ativo} DESC`, clientes.created_at)
    .limit(1);
  if (byName) return byName.id;

  const [created] = await executor.insert(clientes).values({
    tenant_id: tenantId,
    nome: normalizedName,
  }).returning({ id: clientes.id });
  if (!created) throw new Error(`Não foi possível criar o cliente central "${normalizedName}"`);
  return created.id;
}

export async function resetPlmFromApprovedBudgets(tenantId: string) {
  if (tenantId !== "r2pb") {
    throw new Error("Esta reconstrução está autorizada somente para o tenant R2PB");
  }
  return db.transaction(async tx => {
    await tx.execute(sql`
      SELECT pg_advisory_xact_lock(hashtextextended(
        ${`mirage:plm-reset:${tenantId}`}, 0
      ))
    `);

    const approvedItemsResult = await tx.execute(sql`
      SELECT
        item.id AS item_id,
        item.ficha_id,
        item.plm_produto_id AS old_produto_id,
        ficha.plm_produto_id AS ficha_old_produto_id,
        item.referencia AS referencia_orcamento,
        item.descricao,
        ficha.familia,
        orcamento.numero AS orcamento_numero,
        orcamento.cliente_id,
        orcamento.nome_cliente
      FROM itens_orcamento_custos item
      INNER JOIN orcamentos_custos orcamento
        ON orcamento.id = item.orcamento_id
       AND orcamento.tenant_id = item.tenant_id
      LEFT JOIN fichas_custo ficha
        ON ficha.id = item.ficha_id
       AND ficha.tenant_id = item.tenant_id
      WHERE item.tenant_id = ${tenantId}
        AND orcamento.status = 'aprovado'
        AND orcamento.ativo = true
        AND item.is_aviamento = false
        AND item.is_desenvolvimento = false
        AND COALESCE(NULLIF(BTRIM(item.referencia), ''), NULLIF(BTRIM(item.descricao), '')) IS NOT NULL
      ORDER BY orcamento.created_at, orcamento.id, item.created_at, item.id
    `);
    const approvedItems = approvedItemsResult.rows as ApprovedItem[];

    const beforeResult = await tx.execute(sql`
      SELECT
        (SELECT COUNT(*)::INTEGER FROM plm_produtos WHERE tenant_id = ${tenantId}) AS produtos,
        (SELECT COUNT(*)::INTEGER FROM plm_fichas_tecnicas WHERE tenant_id = ${tenantId}) AS fichas,
        (SELECT COUNT(*)::INTEGER FROM plm_pilotos WHERE tenant_id = ${tenantId}) AS pilotos,
        (SELECT COUNT(*)::INTEGER FROM plm_aprovacoes WHERE tenant_id = ${tenantId}) AS aprovacoes
    `);
    const before = beforeResult.rows[0] as {
      produtos: number;
      fichas: number;
      pilotos: number;
      aprovacoes: number;
    };

    const linkedOrderItemsResult = await tx.execute(sql`
      SELECT id, ficha_custo_id, referencia_id, plm_produto_id
      FROM itens_pedido
      WHERE tenant_id = ${tenantId}
        AND (plm_produto_id IS NOT NULL OR plm_ficha_tecnica_id IS NOT NULL)
    `);
    const linkedOrderItems = linkedOrderItemsResult.rows as Array<{
      id: string;
      ficha_custo_id: string | null;
      referencia_id: string | null;
      plm_produto_id: number | null;
    }>;
    const linkedReferencesResult = await tx.execute(sql`
      SELECT id, plm_produto_id
      FROM referencias
      WHERE tenant_id = ${tenantId}
        AND plm_produto_id IS NOT NULL
    `);
    const linkedReferences = linkedReferencesResult.rows as Array<{
      id: string;
      plm_produto_id: number;
    }>;
    const sourceOldProductIds = new Set(approvedItems.flatMap(item =>
      [item.old_produto_id, item.ficha_old_produto_id].filter((id): id is number => id != null),
    ));
    const sourceCostSheetIds = new Set(approvedItems
      .map(item => item.ficha_id)
      .filter((id): id is string => id != null));
    const unsupportedOrderLinks = linkedOrderItems.filter(item =>
      item.plm_produto_id != null
      && !sourceOldProductIds.has(item.plm_produto_id)
      && !(item.ficha_custo_id && sourceCostSheetIds.has(item.ficha_custo_id)),
    );
    if (unsupportedOrderLinks.length > 0) {
      throw new Error(
        `${unsupportedOrderLinks.length} item(ns) de pedido apontam para produtos que não vêm de orçamentos aprovados elegíveis`,
      );
    }

    await tx.execute(sql`
      UPDATE itens_orcamento_custos
      SET plm_produto_id = NULL,
          plm_ficha_tecnica_id = NULL,
          referencia_tecnica = NULL,
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}
    `);
    await tx.execute(sql`
      UPDATE fichas_custo
      SET plm_produto_id = NULL,
          plm_ficha_tecnica_id = NULL,
          referencia_tecnica = NULL,
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}
    `);
    await tx.execute(sql`
      UPDATE itens_pedido
      SET plm_produto_id = NULL,
          plm_ficha_tecnica_id = NULL
      WHERE tenant_id = ${tenantId}
    `);
    await tx.execute(sql`
      UPDATE referencias
      SET plm_produto_id = NULL,
          plm_ficha_tecnica_id = NULL,
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}
    `);

    await tx.execute(sql`
      DELETE FROM plm_piloto_etapas etapa
      USING plm_pilotos piloto
      WHERE etapa.piloto_id = piloto.id AND piloto.tenant_id = ${tenantId}
    `);
    await tx.execute(sql`DELETE FROM plm_aprovacoes WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM plm_pilotos WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`
      DELETE FROM plm_bom_linhas linha
      USING plm_boms bom
      WHERE linha.bom_id = bom.id AND bom.tenant_id = ${tenantId}
    `);
    await tx.execute(sql`DELETE FROM plm_boms WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM plm_moldes WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM plm_fichas_tecnicas WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM plm_auditoria WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM plm_produtos WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM plm_colecoes WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM plm_materiais WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM plm_fornecedores WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM plm_clientes WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM plm_sequencias WHERE tenant_id = ${tenantId}`);

    const productsByLogicalKey = new Map<string, { id: number; reference: string }>();
    const productsByCostSheetId = new Map<string, number>();
    const productsByOldId = new Map<number, number>();

    for (const item of approvedItems) {
      const clientId = await resolveCentralClient(tx, tenantId, item);
      const budgetReference = item.referencia_orcamento?.trim() || item.descricao.trim();
      const logicalKey = `${clientId}:${normalizeKey(budgetReference)}`;
      let product = productsByLogicalKey.get(logicalKey);

      if (!product) {
        const technicalReference = await nextTechnicalReference(tx, tenantId);
        const category = item.familia?.trim().toUpperCase() || "OUTRO";
        await tx.execute(sql`
          INSERT INTO plm_familias_produto (tenant_id, nome)
          VALUES (${tenantId}, ${category})
          ON CONFLICT (tenant_id, nome) DO NOTHING
        `);
        const [created] = await tx.insert(plm_produtos).values({
          tenant_id: tenantId,
          codigo: technicalReference,
          nome: item.descricao.trim(),
          cliente_central_id: clientId,
          referencia_tecnica: technicalReference,
          referencia: technicalReference,
          referencia_cliente: budgetReference,
          categoria: category,
          status: "rascunho",
          observacoes: `Reconstruído a partir do orçamento aprovado ${item.orcamento_numero}`,
        }).returning({ id: plm_produtos.id });
        if (!created) throw new Error(`Falha ao reconstruir o produto "${item.descricao}"`);
        product = { id: created.id, reference: technicalReference };
        productsByLogicalKey.set(logicalKey, product);
      }

      await tx.update(itens_orcamento_custos).set({
        plm_produto_id: product.id,
        plm_ficha_tecnica_id: null,
        referencia_tecnica: product.reference,
        updated_at: new Date(),
      }).where(and(
        eq(itens_orcamento_custos.id, item.item_id),
        eq(itens_orcamento_custos.tenant_id, tenantId),
      ));

      if (item.ficha_id) {
        const currentCostSheetTarget = productsByCostSheetId.get(item.ficha_id);
        if (currentCostSheetTarget && currentCostSheetTarget !== product.id) {
          throw new Error(`A ficha de custo ${item.ficha_id} está vinculada a mais de um produto elegível`);
        }
        productsByCostSheetId.set(item.ficha_id, product.id);
        await tx.update(fichas_custo).set({
          plm_produto_id: product.id,
          plm_ficha_tecnica_id: null,
          referencia_tecnica: product.reference,
          origem: "comercial",
          updated_at: new Date(),
        }).where(and(eq(fichas_custo.id, item.ficha_id), eq(fichas_custo.tenant_id, tenantId)));
      }
      for (const oldProductId of [item.old_produto_id, item.ficha_old_produto_id]) {
        if (!oldProductId) continue;
        const currentTarget = productsByOldId.get(oldProductId);
        if (currentTarget && currentTarget !== product.id) {
          throw new Error(`O produto antigo ${oldProductId} corresponde a mais de um produto reconstruído`);
        }
        productsByOldId.set(oldProductId, product.id);
      }
    }

    const targetProductsByReferenceId = new Map<string, Set<number>>();
    for (const orderItem of linkedOrderItems) {
      const productId = (orderItem.ficha_custo_id
        ? productsByCostSheetId.get(orderItem.ficha_custo_id)
        : undefined)
        ?? (orderItem.plm_produto_id
          ? productsByOldId.get(orderItem.plm_produto_id)
          : undefined);
      if (!productId) {
        throw new Error(`O item de pedido ${orderItem.id} não pôde ser religado ao PLM`);
      }
      await tx.update(itens_pedido).set({
        plm_produto_id: productId,
        plm_ficha_tecnica_id: null,
      }).where(and(eq(itens_pedido.tenant_id, tenantId), eq(itens_pedido.id, orderItem.id)));
      if (orderItem.referencia_id) {
        const targets = targetProductsByReferenceId.get(orderItem.referencia_id) ?? new Set<number>();
        targets.add(productId);
        targetProductsByReferenceId.set(orderItem.referencia_id, targets);
      }
    }
    for (const linkedReference of linkedReferences) {
      const targetsFromOrders = targetProductsByReferenceId.get(linkedReference.id) ?? new Set<number>();
      const targetFromOldProduct = productsByOldId.get(linkedReference.plm_produto_id);
      if (targetFromOldProduct) targetsFromOrders.add(targetFromOldProduct);
      if (targetsFromOrders.size !== 1) {
        throw new Error(
          `A referência Kanban ${linkedReference.id} possui ${targetsFromOrders.size} destinos PLM possíveis`,
        );
      }
      const productId = [...targetsFromOrders][0]!;
      await tx.update(referencias).set({
        plm_produto_id: productId,
        plm_ficha_tecnica_id: null,
        updated_at: new Date(),
      }).where(and(eq(referencias.tenant_id, tenantId), eq(referencias.id, linkedReference.id)));
    }

    const validationResult = await tx.execute(sql`
      SELECT
        (
          SELECT COUNT(*)::INTEGER
          FROM itens_orcamento_custos item
          INNER JOIN orcamentos_custos orcamento
            ON orcamento.id = item.orcamento_id
           AND orcamento.tenant_id = item.tenant_id
          WHERE item.tenant_id = ${tenantId}
            AND orcamento.status = 'aprovado'
            AND orcamento.ativo = true
            AND item.is_aviamento = false
            AND item.is_desenvolvimento = false
            AND COALESCE(NULLIF(BTRIM(item.referencia), ''), NULLIF(BTRIM(item.descricao), '')) IS NOT NULL
            AND (
              item.plm_produto_id IS NULL
              OR NOT EXISTS (
                SELECT 1 FROM plm_produtos produto
                WHERE produto.id = item.plm_produto_id
                  AND produto.tenant_id = item.tenant_id
                  AND produto.referencia_tecnica LIKE ${`${tenantPrefix(tenantId)}-%`}
              )
            )
        ) AS itens_aprovados_pendentes,
        (
          SELECT COUNT(*)::INTEGER
          FROM itens_pedido item
          WHERE item.tenant_id = ${tenantId}
            AND item.id IN ${linkedOrderItems.length > 0
              ? sql`(${sql.join(linkedOrderItems.map(item => sql`${item.id}`), sql`, `)})`
              : sql`(NULL)`}
            AND (
              item.plm_produto_id IS NULL
              OR NOT EXISTS (
                SELECT 1 FROM plm_produtos produto
                WHERE produto.id = item.plm_produto_id
                  AND produto.tenant_id = item.tenant_id
              )
            )
        ) AS itens_pedido_pendentes,
        (
          SELECT COUNT(*)::INTEGER
          FROM referencias referencia
          WHERE referencia.tenant_id = ${tenantId}
            AND referencia.id IN ${linkedReferences.length > 0
              ? sql`(${sql.join(linkedReferences.map(item => sql`${item.id}`), sql`, `)})`
              : sql`(NULL)`}
            AND (
              referencia.plm_produto_id IS NULL
              OR NOT EXISTS (
                SELECT 1 FROM plm_produtos produto
                WHERE produto.id = referencia.plm_produto_id
                  AND produto.tenant_id = referencia.tenant_id
              )
            )
        ) AS referencias_pendentes
    `);
    const validation = validationResult.rows[0] as {
      itens_aprovados_pendentes: number;
      itens_pedido_pendentes: number;
      referencias_pendentes: number;
    };
    const pending = Number(validation.itens_aprovados_pendentes ?? 0)
      + Number(validation.itens_pedido_pendentes ?? 0)
      + Number(validation.referencias_pendentes ?? 0);
    if (pending > 0) {
      throw new Error(
        `Validação falhou: ${validation.itens_aprovados_pendentes} item(ns) aprovado(s), `
        + `${validation.itens_pedido_pendentes} item(ns) de pedido e `
        + `${validation.referencias_pendentes} referência(s) ficaram sem vínculo PLM`,
      );
    }

    return {
      removed: before,
      approvedItems: approvedItems.length,
      rebuiltProducts: productsByLogicalKey.size,
      firstReference: productsByLogicalKey.size > 0 ? `${tenantPrefix(tenantId)}-0001` : null,
      lastReference: productsByLogicalKey.size > 0
        ? `${tenantPrefix(tenantId)}-${String(productsByLogicalKey.size).padStart(4, "0")}`
        : null,
    };
  });
}