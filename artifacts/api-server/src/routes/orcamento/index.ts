import { Router, type IRouter } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { requireAuth, requireTenantAccess, type AuthenticatedRequest } from "../../middlewares/auth";

const router: IRouter = Router();

function calcularOrcamento(subtotal: number, desconto_tipo: string, desconto_valor: number) {
  const desconto = desconto_tipo === "percentual"
    ? subtotal * (desconto_valor / 100)
    : desconto_valor;
  const total = Math.max(0, subtotal - desconto);
  return { total, condicao_sinal: total * 0.5, condicao_retira: total * 0.5, condicao_prazo_valor: total };
}

// ─── FICHAS DE CUSTO ─────────────────────────────────────────

router.get("/orcamento/fichas", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { busca, familia } = req.query;
  let query = supabaseAdmin.from("fichas_custo")
    .select("*, cliente:clientes(id,nome)").eq("tenant_id", req.tenantId!).eq("ativo", true).order("referencia");
  if (busca) query = query.ilike("referencia", `%${busca}%`);
  if (familia) query = query.eq("familia", familia as string);
  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

router.get("/orcamento/fichas/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { data, error } = await supabaseAdmin.from("fichas_custo")
    .select("*, cliente:clientes(id,nome)").eq("id", req.params.id)
    .in("tenant_id", req.userTenantIds ?? []).single();
  if (error) { res.status(404).json({ error: "Ficha não encontrada" }); return; }
  res.json(data);
});

router.post("/orcamento/fichas", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { referencia, tipo, familia, cliente_id, foto_url, observacoes,
    mao_obra_fase1, mao_obra_fase2, mao_obra_fase3, mao_obra_fase4,
    mao_obra_fase5, mao_obra_fase6, mao_obra_fase7, mao_obra_fase8,
    custo_tecido, custo_aviamento } = req.body;
  if (!referencia) { res.status(400).json({ error: "referencia é obrigatória" }); return; }

  const { data, error } = await supabaseAdmin.from("fichas_custo").insert({
    tenant_id: req.tenantId!, referencia, tipo, familia, cliente_id, foto_url, observacoes,
    mao_obra_fase1: mao_obra_fase1 ?? 0, mao_obra_fase2: mao_obra_fase2 ?? 0,
    mao_obra_fase3: mao_obra_fase3 ?? 0, mao_obra_fase4: mao_obra_fase4 ?? 0,
    mao_obra_fase5: mao_obra_fase5 ?? 0, mao_obra_fase6: mao_obra_fase6 ?? 0,
    mao_obra_fase7: mao_obra_fase7 ?? 0, mao_obra_fase8: mao_obra_fase8 ?? 0,
    custo_tecido: custo_tecido ?? 0, custo_aviamento: custo_aviamento ?? 0
  }).select().single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

router.patch("/orcamento/fichas/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const campos = ["referencia","tipo","familia","cliente_id","foto_url","observacoes",
    "mao_obra_fase1","mao_obra_fase2","mao_obra_fase3","mao_obra_fase4",
    "mao_obra_fase5","mao_obra_fase6","mao_obra_fase7","mao_obra_fase8",
    "custo_tecido","custo_aviamento"];
  const update: Record<string, any> = {};
  campos.forEach(c => { if (req.body[c] !== undefined) update[c] = req.body[c]; });
  const { data, error } = await supabaseAdmin.from("fichas_custo")
    .update(update).eq("id", req.params.id).in("tenant_id", req.userTenantIds ?? []).select().single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
});

router.post("/orcamento/fichas/:id/duplicar", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { nova_referencia } = req.body;
  const { data: original, error: errOrig } = await supabaseAdmin.from("fichas_custo")
    .select("*").eq("id", req.params.id).in("tenant_id", req.userTenantIds ?? []).single();
  if (errOrig || !original) { res.status(404).json({ error: "Ficha não encontrada" }); return; }
  const { id: _id, created_at, updated_at, custo_total, ...campos } = original as any;
  const { data, error } = await supabaseAdmin.from("fichas_custo")
    .insert({ ...campos, referencia: nova_referencia ?? `${original.referencia}_COPIA` }).select().single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

router.delete("/orcamento/fichas/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { error } = await supabaseAdmin.from("fichas_custo")
    .update({ ativo: false }).eq("id", req.params.id).in("tenant_id", req.userTenantIds ?? []);
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(204).send();
});

// ─── ORÇAMENTOS ──────────────────────────────────────────────

router.get("/orcamento/orcamentos", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { status } = req.query;
  let query = supabaseAdmin.from("orcamentos")
    .select("*, cliente:clientes(id,nome), itens:itens_orcamento(id,referencia,quantidade,valor_unitario,total)")
    .eq("tenant_id", req.tenantId!).eq("ativo", true).order("created_at", { ascending: false });
  if (status) query = query.eq("status", status as string);
  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

router.get("/orcamento/orcamentos/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { data, error } = await supabaseAdmin.from("orcamentos")
    .select("*, cliente:clientes(*), itens:itens_orcamento(*, ficha:fichas_custo(id,referencia,foto_url))")
    .eq("id", req.params.id).in("tenant_id", req.userTenantIds ?? []).single();
  if (error) { res.status(404).json({ error: "Orçamento não encontrado" }); return; }
  res.json(data);
});

router.post("/orcamento/orcamentos", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { cliente_id, validade, observacoes, desconto_tipo, desconto_valor, itens, condicao_prazo_dias } = req.body;
  const tenantId = req.tenantId!;
  if (!itens?.length) { res.status(400).json({ error: "O orçamento precisa ter ao menos 1 item" }); return; }

  const { count } = await supabaseAdmin.from("orcamentos")
    .select("*", { count: "exact", head: true }).eq("tenant_id", tenantId);
  const numero = `ORC-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const subtotal = itens.reduce((s: number, i: any) => s + (i.quantidade * i.valor_unitario), 0);
  const calculado = calcularOrcamento(subtotal, desconto_tipo ?? "percentual", desconto_valor ?? 0);

  const { data: orcamento, error } = await supabaseAdmin.from("orcamentos").insert({
    tenant_id: tenantId, numero, cliente_id, validade, observacoes,
    desconto_tipo: desconto_tipo ?? "percentual", desconto_valor: desconto_valor ?? 0,
    subtotal, condicao_prazo_dias: condicao_prazo_dias ?? 30, ...calculado
  }).select().single();
  if (error) { res.status(400).json({ error: error.message }); return; }

  await supabaseAdmin.from("itens_orcamento").insert(
    itens.map((i: any) => ({
      tenant_id: tenantId, orcamento_id: orcamento.id,
      ficha_id: i.ficha_id, referencia: i.referencia,
      descricao: i.descricao, quantidade: i.quantidade, valor_unitario: i.valor_unitario
    }))
  );
  res.status(201).json(orcamento);
});

router.patch("/orcamento/orcamentos/:id/desconto-observacoes", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { desconto_tipo, desconto_valor, observacoes } = req.body;
  const { data: orc } = await supabaseAdmin.from("orcamentos")
    .select("subtotal").eq("id", req.params.id).in("tenant_id", req.userTenantIds ?? []).single();
  if (!orc) { res.status(404).json({ error: "Orçamento não encontrado" }); return; }
  const calculado = calcularOrcamento(orc.subtotal, desconto_tipo ?? "percentual", desconto_valor ?? 0);
  const { data, error } = await supabaseAdmin.from("orcamentos")
    .update({ desconto_tipo, desconto_valor, observacoes, ...calculado })
    .eq("id", req.params.id).select().single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
});

router.patch("/orcamento/orcamentos/:id/status", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { status } = req.body;
  const validos = ["rascunho","enviado","aprovado","recusado","cancelado"];
  if (!validos.includes(status)) { res.status(400).json({ error: "Status inválido" }); return; }
  const { data, error } = await supabaseAdmin.from("orcamentos")
    .update({ status }).eq("id", req.params.id).in("tenant_id", req.userTenantIds ?? []).select().single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
});

router.patch("/orcamento/itens/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { quantidade, valor_unitario } = req.body;
  const { data: item, error } = await supabaseAdmin.from("itens_orcamento")
    .update({ quantidade, valor_unitario }).eq("id", req.params.id)
    .in("tenant_id", req.userTenantIds ?? []).select().single();
  if (error) { res.status(400).json({ error: error.message }); return; }

  const { data: itens } = await supabaseAdmin.from("itens_orcamento")
    .select("quantidade,valor_unitario").eq("orcamento_id", (item as any).orcamento_id);
  const subtotal = (itens ?? []).reduce((s, i) => s + (i.quantidade * i.valor_unitario), 0);
  const { data: orc } = await supabaseAdmin.from("orcamentos")
    .select("desconto_tipo,desconto_valor").eq("id", (item as any).orcamento_id).single();
  if (orc) {
    const calculado = calcularOrcamento(subtotal, orc.desconto_tipo, orc.desconto_valor);
    await supabaseAdmin.from("orcamentos").update({ subtotal, ...calculado }).eq("id", (item as any).orcamento_id);
  }
  res.json(item);
});

router.delete("/orcamento/orcamentos/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { error } = await supabaseAdmin.from("orcamentos")
    .update({ ativo: false }).eq("id", req.params.id).in("tenant_id", req.userTenantIds ?? []);
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(204).send();
});

// ─── OBSERVAÇÕES PRÉ-DEFINIDAS ───────────────────────────────

router.get("/orcamento/observacoes", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { categoria } = req.query;
  let query = supabaseAdmin.from("observacoes_predefinidas")
    .select("*").eq("tenant_id", req.tenantId!).eq("ativo", true).order("titulo");
  if (categoria) query = query.eq("categoria", categoria as string);
  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

router.post("/orcamento/observacoes", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { titulo, conteudo, categoria } = req.body;
  if (!titulo || !conteudo) { res.status(400).json({ error: "titulo e conteudo são obrigatórios" }); return; }
  const { data, error } = await supabaseAdmin.from("observacoes_predefinidas")
    .insert({ tenant_id: req.tenantId!, titulo, conteudo, categoria: categoria ?? "geral" }).select().single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

router.patch("/orcamento/observacoes/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { titulo, conteudo, categoria } = req.body;
  const { data, error } = await supabaseAdmin.from("observacoes_predefinidas")
    .update({ titulo, conteudo, categoria }).eq("id", req.params.id).in("tenant_id", req.userTenantIds ?? []).select().single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
});

router.delete("/orcamento/observacoes/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { error } = await supabaseAdmin.from("observacoes_predefinidas")
    .update({ ativo: false }).eq("id", req.params.id).in("tenant_id", req.userTenantIds ?? []);
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(204).send();
});

// ─── DASHBOARD ────────────────────────────────────────────────

router.get("/orcamento/dashboard", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const [orcamentos, fichas] = await Promise.all([
    supabaseAdmin.from("orcamentos").select("status,total").eq("tenant_id", tenantId).eq("ativo", true),
    supabaseAdmin.from("fichas_custo").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("ativo", true),
  ]);
  const orcs = orcamentos.data ?? [];
  const por_status: Record<string, number> = {};
  const total_aprovado = orcs.filter(o => o.status === "aprovado").reduce((s, o) => s + (o.total ?? 0), 0);
  orcs.forEach(o => { por_status[o.status] = (por_status[o.status] ?? 0) + 1; });
  res.json({ orcamentos: { total: orcs.length, por_status, total_aprovado }, fichas: { total: fichas.count ?? 0 } });
});

export default router;
