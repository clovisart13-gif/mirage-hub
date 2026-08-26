import { pool } from "@workspace/db";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";

const DEMO_FICHA_REFERENCE = "DEMO-MOLETOM-01";
const DEMO_BUDGET_NUMBER = "ORC-DEMO-001";
const DEMO_ORDER_NUMBER = "PED-DEMO-001";
const COMPLETION_NOTE = "Base demonstrativa do trial concluída automaticamente.";
const DEMO_V2_NOTE = "Base demonstrativa v2 — cenário fictício e isolado por tenant.";

const DEMO_V2_CLIENTS = [
  { nome: "Coletivo Raiz", email: "contato@coletivoraiz.demo", telefone: "11999990011" },
  { nome: "Studio Nativa", email: "compras@studionativa.demo", telefone: "11999990012" },
  { nome: "Viva Movimento", email: "producao@vivamovimento.demo", telefone: "11999990013" },
];

const DEMO_V2_SUPPLIERS = [
  { nome: "Malharia Sol", email: "vendas@malhariasol.demo", telefone: "11999990101", pix: "financeiro@malhariasol.demo" },
  { nome: "Aviamentos Prisma", email: "comercial@prismaaviamentos.demo", telefone: "11999990102", pix: "pix@prismaaviamentos.demo" },
  { nome: "Oficina Linha Reta", email: "producao@oficinalinhareta.demo", telefone: "11999990103", pix: "pix@oficinalinhareta.demo" },
  { nome: "Lavanderia Azul", email: "atendimento@lavanderiaazul.demo", telefone: "11999990104", pix: "financeiro@lavanderiaazul.demo" },
];

type SeedSummary = {
  clientes: number;
  fornecedores: number;
  referencias: number;
  fichas_custo: number;
  orcamentos: number;
  pedidos: number;
  plm_produtos: number;
};

const emptySummary = (): SeedSummary => ({
  clientes: 0,
  fornecedores: 0,
  referencias: 0,
  fichas_custo: 0,
  orcamentos: 0,
  pedidos: 0,
  plm_produtos: 0,
});

type SqlClient = { query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }> };

async function firstId(client: SqlClient, query: string, values: unknown[]) {
  const result = await client.query(query, values);
  return result.rows[0]?.id as string | number | undefined;
}

async function ensureOperationalTrialBase(tenantId: string, summary: SeedSummary) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let clienteId = await firstId(
      client,
      "SELECT id FROM clientes WHERE tenant_id = $1 AND nome = $2 ORDER BY created_at ASC LIMIT 1",
      [tenantId, "Ateliê Aurora"],
    );
    if (!clienteId) {
      clienteId = await firstId(
        client,
        `INSERT INTO clientes (tenant_id, nome, email, telefone, ativo)
         VALUES ($1, $2, $3, $4, true) RETURNING id`,
        [tenantId, "Ateliê Aurora", "contato@atelieaurora.demo", "11999990001"],
      );
    }
    summary.clientes = 1;

    let fornecedorId = await firstId(
      client,
      "SELECT id FROM fornecedores WHERE tenant_id = $1 AND nome = $2 ORDER BY created_at ASC LIMIT 1",
      [tenantId, "Tecidos Horizonte"],
    );
    if (!fornecedorId) {
      fornecedorId = await firstId(
        client,
        `INSERT INTO fornecedores (tenant_id, nome, email, telefone, pix, ativo)
         VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
        [tenantId, "Tecidos Horizonte", "vendas@tecidoshorizonte.demo", "11999990002", "demo@tecidoshorizonte.demo"],
      );
    }
    summary.fornecedores = 1;

    let gradeId = await firstId(
      client,
      "SELECT id FROM grades WHERE tenant_id = $1 AND nome = $2 ORDER BY created_at ASC LIMIT 1",
      [tenantId, "P ao GG"],
    );
    if (gradeId) {
      await client.query(
        "UPDATE grades SET tamanhos = $1::json WHERE id = $2",
        [JSON.stringify(["P", "M", "G", "GG"]), gradeId],
      );
    } else {
      gradeId = await firstId(
        client,
        "INSERT INTO grades (tenant_id, nome, tamanhos) VALUES ($1, $2, $3::json) RETURNING id",
        [tenantId, "P ao GG", JSON.stringify(["P", "M", "G", "GG"])],
      );
    }

    let pedidoId = await firstId(
      client,
      "SELECT id FROM pedidos WHERE tenant_id = $1 AND numero_pedido = $2 ORDER BY created_at ASC LIMIT 1",
      [tenantId, DEMO_ORDER_NUMBER],
    );
    if (!pedidoId) {
      pedidoId = await firstId(
        client,
        `INSERT INTO pedidos (tenant_id, numero, numero_pedido, cliente_id, nome_cliente, status, origem, valor_total)
         VALUES ($1, $2, $2, $3, $4, 'em_producao', 'trial_demo', 23220) RETURNING id`,
        [tenantId, DEMO_ORDER_NUMBER, clienteId, "Ateliê Aurora"],
      );
    }
    summary.pedidos = 1;

    const itemExists = await firstId(
      client,
      "SELECT id FROM itens_pedido WHERE tenant_id = $1 AND pedido_id = $2 AND referencia = $3 LIMIT 1",
      [tenantId, pedidoId, DEMO_FICHA_REFERENCE],
    );
    if (!itemExists) {
      await client.query(
        `INSERT INTO itens_pedido (tenant_id, pedido_id, referencia, descricao, grade_id, quantidade_total,
          quantidade_por_tamanho, valor_unitario, cmp)
         VALUES ($1, $2, $3, $4, $5, 180, $6::json, 12900, 7770)`,
        [tenantId, pedidoId, DEMO_FICHA_REFERENCE, "Moletom canguru algodão premium", gradeId, JSON.stringify({ P: 30, M: 60, G: 60, GG: 30 })],
      );
    }

    const referencias = [
      { codigo: DEMO_FICHA_REFERENCE, nome: "Moletom canguru premium", fase: "costura", quantidade: 180 },
      { codigo: "DEMO-CAMISETA-02", nome: "Camiseta oversized", fase: "corte", quantidade: 240 },
      { codigo: "DEMO-CALCA-03", nome: "Calça cargo sarja", fase: "tecido", quantidade: 120 },
      { codigo: "DEMO-JAQUETA-04", nome: "Jaqueta varsity", fase: "modelagem", quantidade: 80 },
    ];

    for (const referencia of referencias) {
      const existing = await firstId(
        client,
        "SELECT id FROM referencias WHERE tenant_id = $1 AND codigo = $2 ORDER BY created_at ASC LIMIT 1",
        [tenantId, referencia.codigo],
      );
      if (!existing) {
        await client.query(
          `INSERT INTO referencias (tenant_id, codigo, descricao_modelo, fase_atual, quantidade, quantidade_inicial,
            quantidade_total, cliente_id, nome_cliente, numero_pedido, pedido_id, numero_op, valor_venda, ativo)
           VALUES ($1, $2, $3, $4, $5, $5, $5, $6, $7, $8, $9, $10, 129, true)`,
          [tenantId, referencia.codigo, referencia.nome, referencia.fase, referencia.quantidade, clienteId, "Ateliê Aurora", DEMO_ORDER_NUMBER, pedidoId, `OP-${referencia.codigo.replace("DEMO-", "")}`],
        );
      }
    }
    summary.referencias = referencias.length;

    let colecaoId = await firstId(
      client,
      "SELECT id FROM plm_colecoes WHERE tenant_id = $1 AND nome = $2 ORDER BY id ASC LIMIT 1",
      [tenantId, "Essenciais Urbanos"],
    );
    if (!colecaoId) {
      colecaoId = await firstId(
        client,
        `INSERT INTO plm_colecoes (tenant_id, nome, temporada, ano, descricao)
         VALUES ($1, $2, 'inverno', $3, $4) RETURNING id`,
        [tenantId, "Essenciais Urbanos", new Date().getFullYear(), "Coleção demonstrativa para navegação no trial."],
      );
    }

    let produtoId = await firstId(
      client,
      "SELECT id FROM plm_produtos WHERE tenant_id = $1 AND referencia = $2 ORDER BY id ASC LIMIT 1",
      [tenantId, DEMO_FICHA_REFERENCE],
    );
    if (!produtoId) {
      produtoId = await firstId(
        client,
        `INSERT INTO plm_produtos (tenant_id, codigo, colecao_id, nome, referencia, categoria, status, descricao)
         VALUES ($1, $2, $3, $4, $2, 'moletom', 'desenvolvimento', $5) RETURNING id`,
        [tenantId, "PLM-DEMO-001", colecaoId, "Moletom canguru premium", "Produto demonstrativo vinculado à referência do Kanban."],
      );
    }
    summary.plm_produtos = 1;

    const fichaTecnica = await firstId(
      client,
      "SELECT id FROM plm_fichas_tecnicas WHERE tenant_id = $1 AND produto_id = $2 ORDER BY versao DESC LIMIT 1",
      [tenantId, produtoId],
    );
    if (!fichaTecnica) {
      await client.query(
        `INSERT INTO plm_fichas_tecnicas (tenant_id, codigo, produto_id, status, titulo, familia, tipo_costura, observacoes)
         VALUES ($1, $2, $3, 'em_revisao', $4, $5, $6, $7)`,
        [tenantId, "FT-DEMO-001", produtoId, "Ficha técnica — Moletom canguru premium", "Casual Premium", "Reta reforçada", "Ficha técnica de demonstração."],
      );
    }

    let materialId = await firstId(
      client,
      "SELECT id FROM plm_materiais WHERE tenant_id = $1 AND codigo = $2 ORDER BY id ASC LIMIT 1",
      [tenantId, "MAT-DEMO-001"],
    );
    if (!materialId) {
      materialId = await firstId(
        client,
        `INSERT INTO plm_materiais (tenant_id, tipo, codigo, descricao, unidade, preco_unitario, cor, composicao)
         VALUES ($1, 'tecido', $2, $3, 'kg', 42.5, 'Mescla', '50% algodão, 50% poliéster') RETURNING id`,
        [tenantId, "MAT-DEMO-001", "Moletom 3 cabos premium"],
      );
    }

    let bomId = await firstId(
      client,
      "SELECT id FROM plm_boms WHERE tenant_id = $1 AND produto_id = $2 ORDER BY versao DESC LIMIT 1",
      [tenantId, produtoId],
    );
    if (!bomId) {
      bomId = await firstId(
        client,
        `INSERT INTO plm_boms (tenant_id, codigo, produto_id, custo_mao_de_obra, custos_indiretos, margem_lucro, preco_venda)
         VALUES ($1, $2, $3, 28, 12, 45, 129) RETURNING id`,
        [tenantId, "BOM-DEMO-001", produtoId],
      );
    }

    const bomLine = await firstId(
      client,
      "SELECT id FROM plm_bom_linhas WHERE bom_id = $1 AND material_id = $2 LIMIT 1",
      [bomId, materialId],
    );
    if (!bomLine) {
      await client.query(
        `INSERT INTO plm_bom_linhas (bom_id, material_id, quantidade, preco_unitario, subtotal)
         VALUES ($1, $2, 0.85, 42.5, 36.13)`,
        [bomId, materialId],
      );
    }

    let pilotoId = await firstId(
      client,
      "SELECT id FROM plm_pilotos WHERE tenant_id = $1 AND produto_id = $2 AND numero_piloto = 1 LIMIT 1",
      [tenantId, produtoId],
    );
    if (!pilotoId) {
      pilotoId = await firstId(
        client,
        `INSERT INTO plm_pilotos (tenant_id, produto_id, numero_piloto, status, observacoes)
         VALUES ($1, $2, 1, 'em_andamento', $3) RETURNING id`,
        [tenantId, produtoId, "Piloto demonstrativo para acompanhar a jornada do produto."],
      );
    }

    const etapa = await firstId(
      client,
      "SELECT id FROM plm_piloto_etapas WHERE piloto_id = $1 AND etapa = 'costura' LIMIT 1",
      [pilotoId],
    );
    if (!etapa) {
      await client.query(
        `INSERT INTO plm_piloto_etapas (piloto_id, etapa, resultado, observacoes)
         VALUES ($1, 'costura', 'passou', $2)`,
        [pilotoId, "Etapa demonstrativa concluída."],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function ensureDemoV2OperationalBase(tenantId: string, summary: SeedSummary) {
  const client = await pool.connect();
  let seeded = false;

  const orders = [
    { numero: "TRIALV2-002", cliente: "Coletivo Raiz", status: "pendente", valor: 16800 },
    { numero: "TRIALV2-003", cliente: "Studio Nativa", status: "em_producao", valor: 30500 },
    { numero: "TRIALV2-004", cliente: "Viva Movimento", status: "concluido", valor: 17300 },
  ];
  const references = [
    { codigo: "TRIALV2-CAM-05", nome: "Camiseta oversized", fase: "corte", quantidade: 240, pedido: "TRIALV2-002", cliente: "Coletivo Raiz" },
    { codigo: "TRIALV2-CAL-06", nome: "Calça cargo sarja", fase: "tecido", quantidade: 120, pedido: "TRIALV2-003", cliente: "Studio Nativa" },
    { codigo: "TRIALV2-JAQ-07", nome: "Jaqueta varsity", fase: "modelagem", quantidade: 80, pedido: "TRIALV2-003", cliente: "Studio Nativa" },
    { codigo: "TRIALV2-CRO-08", nome: "Cropped canelado", fase: "costura", quantidade: 160, pedido: "TRIALV2-002", cliente: "Coletivo Raiz" },
    { codigo: "TRIALV2-CAL-09", nome: "Calça utilitária", fase: "acabamento", quantidade: 100, pedido: "TRIALV2-003", cliente: "Studio Nativa" },
    { codigo: "TRIALV2-VES-10", nome: "Vestido midi malha", fase: "concluido", quantidade: 90, pedido: "TRIALV2-004", cliente: "Viva Movimento" },
    { codigo: "TRIALV2-REG-11", nome: "Regata fitness", fase: "risco", quantidade: 200, pedido: "TRIALV2-002", cliente: "Coletivo Raiz" },
    { codigo: "TRIALV2-SHO-12", nome: "Short esportivo", fase: "passadoria", quantidade: 140, pedido: "TRIALV2-004", cliente: "Viva Movimento" },
  ];

  try {
    await client.query("BEGIN");

    const clientIds = new Map<string, string>();
    for (const demoClient of DEMO_V2_CLIENTS) {
      let id = await firstId(client, "SELECT id FROM clientes WHERE tenant_id = $1 AND nome = $2 LIMIT 1", [tenantId, demoClient.nome]);
      if (!id) {
        id = await firstId(
          client,
          "INSERT INTO clientes (tenant_id, nome, email, telefone, ativo) VALUES ($1, $2, $3, $4, true) RETURNING id",
          [tenantId, demoClient.nome, demoClient.email, demoClient.telefone],
        );
        seeded = true;
        summary.clientes += 1;
      }
      if (id) clientIds.set(demoClient.nome, String(id));
    }

    for (const supplier of DEMO_V2_SUPPLIERS) {
      const existing = await firstId(client, "SELECT id FROM fornecedores WHERE tenant_id = $1 AND nome = $2 LIMIT 1", [tenantId, supplier.nome]);
      if (!existing) {
        await client.query(
          "INSERT INTO fornecedores (tenant_id, nome, email, telefone, pix, ativo) VALUES ($1, $2, $3, $4, $5, true)",
          [tenantId, supplier.nome, supplier.email, supplier.telefone, supplier.pix],
        );
        seeded = true;
        summary.fornecedores += 1;
      }
    }

    const gradeId = await firstId(client, "SELECT id FROM grades WHERE tenant_id = $1 AND nome = $2 LIMIT 1", [tenantId, "P ao GG"]);
    const orderIds = new Map<string, string>();
    for (const order of orders) {
      let id = await firstId(client, "SELECT id FROM pedidos WHERE tenant_id = $1 AND numero_pedido = $2 LIMIT 1", [tenantId, order.numero]);
      if (!id) {
        id = await firstId(
          client,
          `INSERT INTO pedidos (tenant_id, numero, numero_pedido, cliente_id, nome_cliente, status, origem, valor_total)
           VALUES ($1, $2, $2, $3, $4, $5, 'trial_demo_v2', $6) RETURNING id`,
          [tenantId, order.numero, clientIds.get(order.cliente), order.cliente, order.status, order.valor],
        );
        seeded = true;
        summary.pedidos += 1;
      }
      if (id) orderIds.set(order.numero, String(id));
    }

    for (const reference of references) {
      const existing = await firstId(client, "SELECT id FROM referencias WHERE tenant_id = $1 AND codigo = $2 LIMIT 1", [tenantId, reference.codigo]);
      if (existing) continue;
      const pedidoId = orderIds.get(reference.pedido);
      await client.query(
        `INSERT INTO referencias (tenant_id, codigo, descricao_modelo, fase_atual, quantidade, quantidade_inicial,
          quantidade_total, cliente_id, nome_cliente, numero_pedido, pedido_id, numero_op, valor_venda, ativo)
         VALUES ($1, $2, $3, $4, $5, $5, $5, $6, $7, $8, $9, $10, $11, true)`,
        [tenantId, reference.codigo, reference.nome, reference.fase, reference.quantidade, clientIds.get(reference.cliente), reference.cliente, reference.pedido, pedidoId, `OP-${reference.codigo.replace("DEMO-", "")}`, 119],
      );
      if (pedidoId && gradeId) {
        await client.query(
          `INSERT INTO itens_pedido (tenant_id, pedido_id, referencia, descricao, grade_id, quantidade_total,
            quantidade_por_tamanho, valor_unitario, cmp)
           VALUES ($1, $2, $3, $4, $5, $6, $7::json, $8, $9)`,
          [tenantId, pedidoId, reference.codigo, reference.nome, gradeId, reference.quantidade, JSON.stringify({ P: 20, M: 40, G: 40, GG: 20 }), 11900, 6900],
        );
      }
      seeded = true;
      summary.referencias += 1;
    }

    const collections = [
      { nome: "Demonstração v2 — Athleisure", temporada: "verao", descricao: "Peças leves para rotina ativa e urbana." },
      { nome: "Demonstração v2 — Utilitários", temporada: "inverno", descricao: "Modelos de sarja e sobreposições para produção em escala." },
    ];
    const collectionIds = new Map<string, number>();
    const baseCollectionId = await firstId(client, "SELECT id FROM plm_colecoes WHERE tenant_id = $1 AND nome = $2 LIMIT 1", [tenantId, "Essenciais Urbanos"]);
    if (baseCollectionId) collectionIds.set("Essenciais Urbanos", Number(baseCollectionId));
    for (const collection of collections) {
      let id = await firstId(client, "SELECT id FROM plm_colecoes WHERE tenant_id = $1 AND nome = $2 LIMIT 1", [tenantId, collection.nome]);
      if (!id) {
        id = await firstId(
          client,
          "INSERT INTO plm_colecoes (tenant_id, nome, temporada, ano, descricao) VALUES ($1, $2, $3, $4, $5) RETURNING id",
          [tenantId, collection.nome, collection.temporada, new Date().getFullYear(), collection.descricao],
        );
        seeded = true;
      }
      if (id) collectionIds.set(collection.nome, Number(id));
    }

    const products = [
      { referencia: "TRIALV2-CAM-05", nome: "Camiseta oversized", categoria: "camiseta", status: "aprovado", colecao: "Essenciais Urbanos", material: "MAT-DEMO-002", preco: 89, piloto: "aprovado" },
      { referencia: "TRIALV2-CAL-06", nome: "Calça cargo sarja", categoria: "calca", status: "pilotagem", colecao: "Demonstração v2 — Utilitários", material: "MAT-DEMO-003", preco: 189, piloto: "em_andamento" },
      { referencia: "TRIALV2-JAQ-07", nome: "Jaqueta varsity", categoria: "jaqueta", status: "desenvolvimento", colecao: "Demonstração v2 — Utilitários", material: "MAT-DEMO-004", preco: 249, piloto: "em_andamento" },
      { referencia: "TRIALV2-CRO-08", nome: "Cropped canelado", categoria: "blusa", status: "aprovado", colecao: "Demonstração v2 — Athleisure", material: "MAT-DEMO-005", preco: 79, piloto: "aprovado" },
      { referencia: "TRIALV2-CAL-09", nome: "Calça utilitária", categoria: "calca", status: "pilotagem", colecao: "Demonstração v2 — Utilitários", material: "MAT-DEMO-003", preco: 199, piloto: "reprovado" },
      { referencia: "TRIALV2-VES-10", nome: "Vestido midi malha", categoria: "vestido", status: "aprovado", colecao: "Essenciais Urbanos", material: "MAT-DEMO-006", preco: 159, piloto: "aprovado" },
      { referencia: "TRIALV2-REG-11", nome: "Regata fitness", categoria: "blusa", status: "rascunho", colecao: "Demonstração v2 — Athleisure", material: "MAT-DEMO-007", preco: 69, piloto: "em_andamento" },
      { referencia: "TRIALV2-SHO-12", nome: "Short esportivo", categoria: "short", status: "desenvolvimento", colecao: "Demonstração v2 — Athleisure", material: "MAT-DEMO-007", preco: 99, piloto: "em_andamento" },
    ];
    const materials = [
      { codigo: "MAT-DEMO-002", tipo: "tecido", descricao: "Malha algodão penteado 30.1", unidade: "kg", preco: 38.5, cor: "Off-white", composicao: "100% algodão" },
      { codigo: "MAT-DEMO-003", tipo: "tecido", descricao: "Sarja peletizada", unidade: "metro", preco: 31.9, cor: "Areia", composicao: "98% algodão, 2% elastano" },
      { codigo: "MAT-DEMO-004", tipo: "tecido", descricao: "Lã fria para jaqueta", unidade: "metro", preco: 58.0, cor: "Marinho", composicao: "80% poliéster, 20% viscose" },
      { codigo: "MAT-DEMO-005", tipo: "tecido", descricao: "Canelado power", unidade: "kg", preco: 44.0, cor: "Preto", composicao: "92% poliamida, 8% elastano" },
      { codigo: "MAT-DEMO-006", tipo: "tecido", descricao: "Malha viscolycra", unidade: "kg", preco: 35.0, cor: "Terracota", composicao: "96% viscose, 4% elastano" },
      { codigo: "MAT-DEMO-007", tipo: "tecido", descricao: "Dry fit leve", unidade: "metro", preco: 27.5, cor: "Azul cobalto", composicao: "92% poliéster, 8% elastano" },
    ];
    const materialIds = new Map<string, number>();
    for (const material of materials) {
      let id = await firstId(client, "SELECT id FROM plm_materiais WHERE tenant_id = $1 AND codigo = $2 LIMIT 1", [tenantId, material.codigo]);
      if (!id) {
        id = await firstId(
          client,
          `INSERT INTO plm_materiais (tenant_id, tipo, codigo, descricao, unidade, preco_unitario, cor, composicao, observacoes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [tenantId, material.tipo, material.codigo, material.descricao, material.unidade, material.preco, material.cor, material.composicao, DEMO_V2_NOTE],
        );
        seeded = true;
      }
      if (id) materialIds.set(material.codigo, Number(id));
    }

    for (const product of products) {
      let productId = await firstId(client, "SELECT id FROM plm_produtos WHERE tenant_id = $1 AND referencia = $2 LIMIT 1", [tenantId, product.referencia]);
      if (!productId) {
        productId = await firstId(
          client,
          `INSERT INTO plm_produtos (tenant_id, codigo, colecao_id, nome, referencia, categoria, status, descricao, observacoes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [tenantId, `PLM-${product.referencia.replace("DEMO-", "")}`, collectionIds.get(product.colecao), product.nome, product.referencia, product.categoria, product.status, `Produto demonstrativo: ${product.nome}.`, DEMO_V2_NOTE],
        );
        seeded = true;
        summary.plm_produtos += 1;
      }
      if (!productId) continue;

      const ficha = await firstId(client, "SELECT id FROM plm_fichas_tecnicas WHERE tenant_id = $1 AND produto_id = $2 LIMIT 1", [tenantId, productId]);
      if (!ficha) {
        await client.query(
          `INSERT INTO plm_fichas_tecnicas (tenant_id, codigo, produto_id, status, titulo, familia, tipo_costura, instrucao_lavagem, bordado_estampa, aviamentos, observacoes)
           VALUES ($1, $2, $3, $4, $5, $6, 'Reta e overlock', 'Lavar à máquina em ciclo suave', 'Sem estampa', 'Etiqueta de composição e tag', $7)`,
          [tenantId, `FT-${product.referencia.replace("DEMO-", "")}`, productId, product.status === "aprovado" ? "aprovada" : "em_revisao", `Ficha técnica — ${product.nome}`, product.colecao, DEMO_V2_NOTE],
        );
        seeded = true;
      }

      let bomId = await firstId(client, "SELECT id FROM plm_boms WHERE tenant_id = $1 AND produto_id = $2 LIMIT 1", [tenantId, productId]);
      if (!bomId) {
        bomId = await firstId(
          client,
          `INSERT INTO plm_boms (tenant_id, codigo, produto_id, custo_mao_de_obra, custos_indiretos, margem_lucro, preco_venda, observacoes)
           VALUES ($1, $2, $3, 24, 11, 45, $4, $5) RETURNING id`,
          [tenantId, `BOM-${product.referencia.replace("DEMO-", "")}`, productId, product.preco, DEMO_V2_NOTE],
        );
        seeded = true;
      }
      const materialId = materialIds.get(product.material);
      if (bomId && materialId) {
        const bomLine = await firstId(client, "SELECT id FROM plm_bom_linhas WHERE bom_id = $1 AND material_id = $2 LIMIT 1", [bomId, materialId]);
        if (!bomLine) {
          await client.query(
            "INSERT INTO plm_bom_linhas (bom_id, material_id, quantidade, preco_unitario, subtotal, observacoes) VALUES ($1, $2, 0.8, 35, 28, $3)",
            [bomId, materialId, DEMO_V2_NOTE],
          );
          seeded = true;
        }
      }

      let pilotoId = await firstId(client, "SELECT id FROM plm_pilotos WHERE tenant_id = $1 AND produto_id = $2 AND numero_piloto = 1 LIMIT 1", [tenantId, productId]);
      if (!pilotoId) {
        pilotoId = await firstId(
          client,
          "INSERT INTO plm_pilotos (tenant_id, produto_id, numero_piloto, status, observacoes) VALUES ($1, $2, 1, $3, $4) RETURNING id",
          [tenantId, productId, product.piloto, DEMO_V2_NOTE],
        );
        seeded = true;
      }
      if (pilotoId) {
        const etapa = await firstId(client, "SELECT id FROM plm_piloto_etapas WHERE piloto_id = $1 AND etapa = 'controle_qualidade' LIMIT 1", [pilotoId]);
        if (!etapa) {
          await client.query(
            "INSERT INTO plm_piloto_etapas (piloto_id, etapa, resultado, observacoes) VALUES ($1, 'controle_qualidade', $2, $3)",
            [pilotoId, product.piloto === "reprovado" ? "ajuste_necessario" : product.piloto === "aprovado" ? "passou" : "pendente", DEMO_V2_NOTE],
          );
          seeded = true;
        }
      }
    }

    await client.query("COMMIT");
    return seeded;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function ensureBudgetTrialBase(tenantId: string, summary: SeedSummary) {
  const { data: existingClient, error: clientLookupError } = await supabaseAdmin
    .from("clientes")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("nome", "Ateliê Aurora")
    .limit(1)
    .maybeSingle();
  if (clientLookupError) throw new Error(`Não foi possível consultar o cliente do orçamento: ${clientLookupError.message}`);

  let clienteId = (existingClient as any)?.id as string | undefined;
  if (!clienteId) {
    const { data, error } = await supabaseAdmin.from("clientes").insert({
      tenant_id: tenantId,
      nome: "Ateliê Aurora",
      email: "contato@atelieaurora.demo",
      telefone: "11999990001",
      ativo: true,
    } as any).select("id").single();
    if (error || !data) throw new Error(`Não foi possível criar o cliente do orçamento: ${error?.message ?? "registro ausente"}`);
    clienteId = (data as any).id;
  }

  const { data: existingFicha, error: fichaLookupError } = await supabaseAdmin
    .from("fichas_custo")
    .select("id, observacoes")
    .eq("tenant_id", tenantId)
    .eq("referencia", DEMO_FICHA_REFERENCE)
    .limit(1)
    .maybeSingle();
  if (fichaLookupError) throw new Error(`Não foi possível consultar a ficha demonstrativa: ${fichaLookupError.message}`);

  let fichaId = (existingFicha as any)?.id as string | undefined;
  if (!fichaId) {
    const { data, error } = await supabaseAdmin.from("fichas_custo").insert({
      tenant_id: tenantId,
      referencia: DEMO_FICHA_REFERENCE,
      tipo: "Moletom",
      familia: "Casual Premium",
      cliente_id: clienteId,
      custo_tecido: 42.5,
      custo_aviamento: 6.8,
      observacoes: "Ficha de custo demonstrativa do trial.",
    } as any).select("id").single();
    if (error || !data) throw new Error(`Não foi possível criar a ficha demonstrativa: ${error?.message ?? "registro ausente"}`);
    fichaId = (data as any).id;
  }
  summary.fichas_custo = 1;

  const { data: existingBudget, error: budgetLookupError } = await supabaseAdmin
    .from("orcamentos")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("numero", DEMO_BUDGET_NUMBER)
    .limit(1)
    .maybeSingle();
  if (budgetLookupError) throw new Error(`Não foi possível consultar o orçamento demonstrativo: ${budgetLookupError.message}`);

  let orcamentoId = (existingBudget as any)?.id as string | undefined;
  if (!orcamentoId) {
    const { data, error } = await supabaseAdmin.from("orcamentos").insert({
      tenant_id: tenantId,
      numero: DEMO_BUDGET_NUMBER,
      cliente_id: clienteId,
      validade: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: "aprovado",
      observacoes: "Orçamento aprovado para demonstrar o fluxo de trial.",
      subtotal: 23220,
      desconto_tipo: "percentual",
      desconto_valor: 0,
      condicao_sinal: 11610,
      condicao_retira: 11610,
      condicao_prazo_valor: 23220,
      condicao_prazo_dias: 30,
      ativo: true,
    } as any).select("id").single();
    if (error || !data) throw new Error(`Não foi possível criar o orçamento demonstrativo: ${error?.message ?? "registro ausente"}`);
    orcamentoId = (data as any).id;
  }
  summary.orcamentos = 1;

  const { data: existingItem, error: itemLookupError } = await supabaseAdmin
    .from("itens_orcamento")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("orcamento_id", orcamentoId)
    .eq("referencia", DEMO_FICHA_REFERENCE)
    .limit(1)
    .maybeSingle();
  if (itemLookupError) throw new Error(`Não foi possível consultar o item demonstrativo: ${itemLookupError.message}`);
  if (!existingItem) {
    const { error } = await supabaseAdmin.from("itens_orcamento").insert({
      tenant_id: tenantId,
      orcamento_id: orcamentoId,
      ficha_id: fichaId,
      referencia: DEMO_FICHA_REFERENCE,
      descricao: "Moletom canguru algodão premium",
      quantidade: 180,
      valor_unitario: 129,
    } as any);
    if (error) throw new Error(`Não foi possível criar o item do orçamento: ${error.message}`);
  }

  const { error: markerError } = await supabaseAdmin
    .from("fichas_custo")
    .update({ observacoes: COMPLETION_NOTE } as any)
    .eq("id", fichaId)
    .eq("tenant_id", tenantId);
  if (markerError) throw new Error(`Não foi possível confirmar a base demonstrativa: ${markerError.message}`);
}

async function ensureDemoV2BudgetBase(tenantId: string, summary: SeedSummary) {
  const demoBudgets = [
    {
      referencia: "TRIALV2-CAM-05",
      tipo: "Camiseta",
      familia: "Essenciais Urbanos",
      cliente: "Coletivo Raiz",
      numero: "TRIALV2-ORC-002",
      status: "enviado",
      quantidade: 240,
      valorUnitario: 89,
      custoTecido: 38.5,
      custoAviamento: 4.2,
      observacoes: "Orçamento enviado para aprovação: camiseta oversized em malha de algodão.",
    },
    {
      referencia: "TRIALV2-CAL-06",
      tipo: "Calça",
      familia: "Utilitários Contemporâneos",
      cliente: "Studio Nativa",
      numero: "TRIALV2-ORC-003",
      status: "rascunho",
      quantidade: 120,
      valorUnitario: 189,
      custoTecido: 31.9,
      custoAviamento: 9.5,
      observacoes: "Orçamento em rascunho: calça cargo de sarja com ajustes de modelagem pendentes.",
    },
  ];
  let seeded = false;

  for (const demo of demoBudgets) {
    const { data: client, error: clientError } = await supabaseAdmin
      .from("clientes")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("nome", demo.cliente)
      .maybeSingle();
    if (clientError || !client) throw new Error(`Não foi possível localizar o cliente demonstrativo ${demo.cliente}`);

    let fichaId: string | undefined;
    const { data: existingFicha, error: fichaError } = await supabaseAdmin
      .from("fichas_custo")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("referencia", demo.referencia)
      .maybeSingle();
    if (fichaError) throw new Error(`Não foi possível consultar a ficha ${demo.referencia}: ${fichaError.message}`);
    fichaId = (existingFicha as any)?.id;
    if (!fichaId) {
      const { data, error } = await supabaseAdmin
        .from("fichas_custo")
        .insert({
          tenant_id: tenantId,
          referencia: demo.referencia,
          tipo: demo.tipo,
          familia: demo.familia,
          cliente_id: (client as any).id,
          custo_tecido: demo.custoTecido,
          custo_aviamento: demo.custoAviamento,
          observacoes: DEMO_V2_NOTE,
        } as any)
        .select("id")
        .single();
      if (error || !data) throw new Error(`Não foi possível criar a ficha ${demo.referencia}: ${error?.message ?? "registro ausente"}`);
      fichaId = (data as any).id;
      seeded = true;
      summary.fichas_custo += 1;
    }

    let orcamentoId: string | undefined;
    const { data: existingBudget, error: budgetError } = await supabaseAdmin
      .from("orcamentos")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("numero", demo.numero)
      .maybeSingle();
    if (budgetError) throw new Error(`Não foi possível consultar o orçamento ${demo.numero}: ${budgetError.message}`);
    orcamentoId = (existingBudget as any)?.id;
    if (!orcamentoId) {
      const subtotal = demo.quantidade * demo.valorUnitario;
      const { data, error } = await supabaseAdmin
        .from("orcamentos")
        .insert({
          tenant_id: tenantId,
          numero: demo.numero,
          cliente_id: (client as any).id,
          validade: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          status: demo.status,
          observacoes: demo.observacoes,
          subtotal,
          desconto_tipo: "percentual",
          desconto_valor: 0,
          condicao_sinal: subtotal * 0.5,
          condicao_retira: subtotal * 0.5,
          condicao_prazo_valor: subtotal,
          condicao_prazo_dias: 30,
          ativo: true,
        } as any)
        .select("id")
        .single();
      if (error || !data) throw new Error(`Não foi possível criar o orçamento ${demo.numero}: ${error?.message ?? "registro ausente"}`);
      orcamentoId = (data as any).id;
      seeded = true;
      summary.orcamentos += 1;
    }

    const { data: existingItem, error: itemError } = await supabaseAdmin
      .from("itens_orcamento")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("orcamento_id", orcamentoId)
      .eq("referencia", demo.referencia)
      .maybeSingle();
    if (itemError) throw new Error(`Não foi possível consultar o item ${demo.referencia}: ${itemError.message}`);
    if (!existingItem) {
      const { error } = await supabaseAdmin.from("itens_orcamento").insert({
        tenant_id: tenantId,
        orcamento_id: orcamentoId,
        ficha_id: fichaId,
        referencia: demo.referencia,
        descricao: `${demo.tipo} demonstrativa`,
        quantidade: demo.quantidade,
        valor_unitario: demo.valorUnitario,
      } as any);
      if (error) throw new Error(`Não foi possível criar o item ${demo.referencia}: ${error.message}`);
      seeded = true;
    }
  }
  return seeded;
}

export async function hasTrialDemoData(tenantId: string) {
  const { data, error } = await supabaseAdmin
    .from("fichas_custo")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("referencia", DEMO_FICHA_REFERENCE)
    .eq("observacoes", COMPLETION_NOTE)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Não foi possível verificar a base demonstrativa: ${error.message}`);
  return Boolean(data);
}

async function withTenantSeedLock<T>(tenantId: string, operation: () => Promise<T>) {
  const lockClient = await pool.connect();
  try {
    await lockClient.query("SELECT pg_advisory_lock(hashtext($1))", [tenantId]);
    return await operation();
  } finally {
    try {
      await lockClient.query("SELECT pg_advisory_unlock(hashtext($1))", [tenantId]);
    } finally {
      lockClient.release();
    }
  }
}

/**
 * Popula somente tenants de trial com uma operação fictícia, porém navegável.
 * Os dados são gravados nas mesmas bases consultadas por Kanban, PLM e Orçamento.
 */
async function assertTrialTenant(tenantId: string) {
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .select("id, assinatura_status")
    .eq("id", tenantId)
    .maybeSingle();
  if (tenantError || !tenant) throw new Error("O tenant do trial não foi encontrado para preparação de dados demonstrativos");
  if ((tenant as any).assinatura_status !== "trial") {
    throw new Error("Dados demonstrativos só podem ser preparados para um tenant com assinatura trial");
  }
}

export async function ensureTrialDemoData(tenantId: string): Promise<{ seeded: boolean; summary: SeedSummary }> {
  await assertTrialTenant(tenantId);
  return withTenantSeedLock(tenantId, async () => {
    const hadBaseline = await hasTrialDemoData(tenantId);
    const summary = emptySummary();
    await ensureOperationalTrialBase(tenantId, summary);
    await ensureBudgetTrialBase(tenantId, summary);
    const operationalV2Seeded = await ensureDemoV2OperationalBase(tenantId, summary);
    const budgetV2Seeded = await ensureDemoV2BudgetBase(tenantId, summary);
    const seeded = !hadBaseline || operationalV2Seeded || budgetV2Seeded;
    logger.info({ tenantId, summary, version: "v2", seeded }, "Base demonstrativa preparada para trial");
    return { seeded, summary };
  });
}

/**
 * Complementa uma base de trial já existente sem executar o seed legado,
 * que pode ajustar dados v1. Usado exclusivamente para a atualização v2.
 */
export async function ensureTrialDemoV2Data(tenantId: string): Promise<{ seeded: boolean; summary: SeedSummary }> {
  await assertTrialTenant(tenantId);
  return withTenantSeedLock(tenantId, async () => {
    const summary = emptySummary();
    const operationalV2Seeded = await ensureDemoV2OperationalBase(tenantId, summary);
    const budgetV2Seeded = await ensureDemoV2BudgetBase(tenantId, summary);
    const seeded = operationalV2Seeded || budgetV2Seeded;
    logger.info({ tenantId, summary, version: "v2", seeded }, "Base demonstrativa v2 atualizada sem reset");
    return { seeded, summary };
  });
}

async function assertReservedTrialLabTenant(tenantId: string, expectedUserId?: string) {
  const { data: tenant, error } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug, owner_id, plan, assinatura_status")
    .eq("id", tenantId)
    .maybeSingle();
  if (error || !tenant) throw new Error("O tenant reservado do laboratório não foi encontrado");

  const candidate = tenant as any;
  if (!candidate.owner_id) throw new Error("Recusado: o tenant não possui um proprietário");
  if (expectedUserId && candidate.owner_id !== expectedUserId) {
    throw new Error("Recusado: o tenant não pertence à identidade reservada do Laboratório");
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(candidate.owner_id);
  const user = authData?.user;
  if (authError || !user) throw new Error("Não foi possível validar a conta reservada do laboratório");

  if (user.user_metadata?.is_trial_lab !== true) {
    throw new Error("Recusado: a conta associada não possui a identidade imutável do Laboratório de Trial");
  }
  if (user.user_metadata?.trial_lab_tenant_id !== tenantId) {
    throw new Error("Recusado: o tenant não está vinculado ao marcador imutável do Laboratório");
  }

  return { tenant: candidate, userId: candidate.owner_id as string };
}

export async function ensureTrialLabDemoData(tenantId: string, expectedUserId?: string) {
  await assertReservedTrialLabTenant(tenantId, expectedUserId);
  return ensureTrialDemoData(tenantId);
}

export async function upgradeTrialLabDemoData(tenantId: string, expectedUserId?: string) {
  await assertReservedTrialLabTenant(tenantId, expectedUserId);
  return withTenantSeedLock(tenantId, async () => {
    if (!(await hasTrialDemoData(tenantId))) {
      throw new Error("A base demonstrativa atual não está pronta para atualização. Use o reset explícito para recriá-la antes de aplicar a v2.");
    }
    const summary = emptySummary();
    const operationalV2Seeded = await ensureDemoV2OperationalBase(tenantId, summary);
    const budgetV2Seeded = await ensureDemoV2BudgetBase(tenantId, summary);
    const seeded = operationalV2Seeded || budgetV2Seeded;
    logger.info({ tenantId, summary, version: "v2", seeded }, "Base demonstrativa v2 atualizada no Laboratório sem reset");
    return { seeded, summary };
  });
}

export async function deleteTrialDemoData(tenantId: string, expectedUserId?: string) {
  await assertReservedTrialLabTenant(tenantId, expectedUserId);
  return withTenantSeedLock(tenantId, () => deleteTrialDemoDataLocked(tenantId));
}

async function deleteTrialDemoDataLocked(tenantId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM plm_piloto_etapas WHERE piloto_id IN (SELECT id FROM plm_pilotos WHERE tenant_id = $1)", [tenantId]);
    await client.query("DELETE FROM plm_bom_linhas WHERE bom_id IN (SELECT id FROM plm_boms WHERE tenant_id = $1)", [tenantId]);
    await client.query("DELETE FROM plm_pilotos WHERE tenant_id = $1", [tenantId]);
    await client.query("DELETE FROM plm_boms WHERE tenant_id = $1", [tenantId]);
    await client.query("DELETE FROM plm_materiais WHERE tenant_id = $1", [tenantId]);
    await client.query("DELETE FROM plm_fichas_tecnicas WHERE tenant_id = $1", [tenantId]);
    await client.query("DELETE FROM plm_produtos WHERE tenant_id = $1", [tenantId]);
    await client.query("DELETE FROM plm_colecoes WHERE tenant_id = $1", [tenantId]);
    await client.query("DELETE FROM itens_pedido WHERE tenant_id = $1", [tenantId]);
    await client.query("DELETE FROM referencias WHERE tenant_id = $1", [tenantId]);
    await client.query("DELETE FROM pedidos WHERE tenant_id = $1", [tenantId]);
    await client.query("DELETE FROM grades WHERE tenant_id = $1", [tenantId]);
    await client.query("DELETE FROM fornecedores WHERE tenant_id = $1", [tenantId]);
    await client.query("DELETE FROM clientes WHERE tenant_id = $1", [tenantId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  for (const table of ["itens_orcamento", "orcamentos", "fichas_custo", "clientes"]) {
    const { error } = await supabaseAdmin.from(table as any).delete().eq("tenant_id", tenantId);
    if (error) throw new Error(`Não foi possível limpar ${table}: ${error.message}`);
  }
}

export async function seedExistingTrialTenants() {
  logger.info("Seed global de trials ignorado: dados demonstrativos são preparados somente na ativação do tenant específico");
}