import { db } from "@workspace/db";
import { clientes, plm_produtos } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

type ApprovedItem = {
  item_id: string;
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

function tenantPrefix(tenantSlug: string) {
  return tenantSlug.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase().padEnd(4, "X");
}

async function nextTechnicalReference(executor: any, tenantId: string, tenantSlug: string) {
  const result = await executor.execute(sql`
    INSERT INTO plm_sequencias (tenant_id, prefixo, ultimo_numero)
    VALUES (${tenantId}, 'TECH', 1)
    ON CONFLICT (tenant_id, prefixo)
    DO UPDATE SET ultimo_numero = plm_sequencias.ultimo_numero + 1
    RETURNING ultimo_numero
  `);
  const number = Number((result.rows[0] as any).ultimo_numero);
  return `${tenantPrefix(tenantSlug)}-${String(number).padStart(4, "0")}`;
}

export async function resetPlmFromApprovedBudgets(tenantId: string, trustedTenantSlug: string) {
  const tenantSlug = trustedTenantSlug.trim().toLowerCase();
  if (tenantSlug !== "r2pb") {
    throw new Error("Esta reconstrução está autorizada somente para o tenant R2PB");
  }

  return db.transaction(async tx => {
    await tx.execute(sql`
      SELECT pg_advisory_xact_lock(hashtextextended(
        ${`mirage:plm-reset:${tenantId}`}, 0
      ))
    `);
    // Impede criação concorrente de clientes enquanto nomes sem vínculo são
    // resolvidos/criados. Leituras continuam permitidas.
    await tx.execute(sql`LOCK TABLE clientes IN SHARE ROW EXCLUSIVE MODE`);

    // Orçamentos e fichas de custo são somente fonte de leitura.
    // Nenhuma tabela externa ao PLM é atualizada por esta operação.
    const approvedItemsResult = await tx.execute(sql`
      SELECT
        item.id AS item_id,
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
    const centralClientByItemId = new Map<string, string>();
    const centralClientByName = new Map<string, string>();
    const createdCentralClients: Array<{ id: string; nome: string }> = [];

    // Resolve todas as dependências externas antes de apagar qualquer dado do PLM.
    // Orçamentos sem vínculo podem criar somente o cliente central necessário;
    // nenhum orçamento, pedido ou registro do Kanban é atualizado.
    for (const item of approvedItems) {
      if (item.cliente_id) {
        const [byId] = await tx.select({ id: clientes.id }).from(clientes)
          .where(and(eq(clientes.id, item.cliente_id), eq(clientes.tenant_id, tenantId)))
          .limit(1);
        if (byId) {
          centralClientByItemId.set(item.item_id, byId.id);
          continue;
        }
      }

      const normalizedName = item.nome_cliente.trim();
      const nameKey = normalizeKey(normalizedName);
      const cachedId = centralClientByName.get(nameKey);
      if (cachedId) {
        centralClientByItemId.set(item.item_id, cachedId);
        continue;
      }

      const [byName] = await tx.select({ id: clientes.id }).from(clientes)
        .where(and(
          eq(clientes.tenant_id, tenantId),
          sql`LOWER(BTRIM(${clientes.nome})) = LOWER(BTRIM(${normalizedName}))`,
        ))
        .orderBy(sql`${clientes.ativo} DESC`, clientes.created_at)
        .limit(1);
      if (byName) {
        centralClientByName.set(nameKey, byName.id);
        centralClientByItemId.set(item.item_id, byName.id);
        continue;
      }

      const [createdClient] = await tx.insert(clientes).values({
        tenant_id: tenantId,
        nome: normalizedName,
        ativo: true,
      }).returning({ id: clientes.id, nome: clientes.nome });
      if (!createdClient) {
        throw new Error(`Falha ao criar o cliente central "${normalizedName}"; toda a operação foi revertida`);
      }
      centralClientByName.set(nameKey, createdClient.id);
      centralClientByItemId.set(item.item_id, createdClient.id);
      createdCentralClients.push(createdClient);
    }

    // Compartilhado com todos os demais geradores de referência técnica.
    await tx.execute(sql`
      SELECT pg_advisory_xact_lock(hashtextextended(
        ${`mirage:plm-tech-sequence:${tenantId}`}, 0
      ))
    `);

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

    const productsByLogicalKey = new Map<string, { id: number; customerReference: string }>();

    for (const item of approvedItems) {
      const clientId = centralClientByItemId.get(item.item_id);
      if (!clientId) {
        throw new Error(`O cliente central de "${item.nome_cliente}" não foi resolvido; toda a operação foi revertida`);
      }
      const originalReference = item.referencia_orcamento?.trim() || item.descricao.trim();
      const logicalKey = `${clientId}:${normalizeKey(originalReference)}`;
      if (productsByLogicalKey.has(logicalKey)) continue;

      const generatedCode = await nextTechnicalReference(tx, tenantId, tenantSlug);
      const category = item.familia?.trim().toUpperCase() || "OUTRO";
      await tx.execute(sql`
        INSERT INTO plm_familias_produto (tenant_id, nome)
        VALUES (${tenantId}, ${category})
        ON CONFLICT (tenant_id, nome) DO NOTHING
      `);
      const [created] = await tx.insert(plm_produtos).values({
        tenant_id: tenantId,
        codigo: generatedCode,
        nome: item.descricao.trim(),
        cliente_central_id: clientId,
        referencia_tecnica: generatedCode,
        referencia: originalReference,
        referencia_cliente: generatedCode,
        categoria: category,
        status: "rascunho",
        observacoes: `Reconstruído a partir do orçamento aprovado ${item.orcamento_numero}`,
      }).returning({ id: plm_produtos.id });
      if (!created) throw new Error(`Falha ao reconstruir o produto "${item.descricao}"`);
      productsByLogicalKey.set(logicalKey, { id: created.id, customerReference: generatedCode });
    }

    const validationResult = await tx.execute(sql`
      SELECT
        (SELECT COUNT(*)::INTEGER FROM plm_produtos WHERE tenant_id = ${tenantId}) AS produtos,
        (SELECT COUNT(*)::INTEGER FROM plm_fichas_tecnicas WHERE tenant_id = ${tenantId}) AS fichas,
        (SELECT COUNT(*)::INTEGER FROM plm_pilotos WHERE tenant_id = ${tenantId}) AS pilotos,
        (SELECT COUNT(DISTINCT referencia_tecnica)::INTEGER FROM plm_produtos WHERE tenant_id = ${tenantId}) AS referencias_distintas,
        (SELECT MIN(referencia_tecnica) FROM plm_produtos WHERE tenant_id = ${tenantId}) AS primeira_referencia,
        (SELECT MAX(referencia_tecnica) FROM plm_produtos WHERE tenant_id = ${tenantId}) AS ultima_referencia,
        (
          SELECT COUNT(*)::INTEGER
          FROM plm_produtos
          WHERE tenant_id = ${tenantId}
            AND (
              codigo <> referencia_tecnica
              OR referencia_cliente <> referencia_tecnica
              OR referencia IS NULL
              OR BTRIM(referencia) = ''
              OR referencia_tecnica NOT LIKE ${`${tenantPrefix(tenantSlug)}-%`}
            )
        ) AS identidades_invalidas
    `);
    const validation = validationResult.rows[0] as {
      produtos: number;
      fichas: number;
      pilotos: number;
      referencias_distintas: number;
      primeira_referencia: string | null;
      ultima_referencia: string | null;
      identidades_invalidas: number;
    };
    const expectedFirstReference = productsByLogicalKey.size > 0
      ? `${tenantPrefix(tenantSlug)}-0001`
      : null;
    const expectedLastReference = productsByLogicalKey.size > 0
      ? `${tenantPrefix(tenantSlug)}-${String(productsByLogicalKey.size).padStart(4, "0")}`
      : null;
    if (
      Number(validation.produtos) !== productsByLogicalKey.size
      || Number(validation.fichas) !== 0
      || Number(validation.pilotos) !== 0
      || Number(validation.referencias_distintas) !== productsByLogicalKey.size
      || validation.primeira_referencia !== expectedFirstReference
      || validation.ultima_referencia !== expectedLastReference
      || Number(validation.identidades_invalidas) !== 0
    ) {
      throw new Error("A validação interna do PLM falhou; toda a operação foi revertida");
    }

    return {
      removed: before,
      approvedItems: approvedItems.length,
      rebuiltProducts: productsByLogicalKey.size,
      createdCentralClients,
      firstReference: validation.primeira_referencia,
      lastReference: validation.ultima_referencia,
    };
  });
}