import { apiFetch } from "./api";

export async function getResumo() {
  return apiFetch("/relatorios/resumo");
}

export async function getFaturamentoMensal() {
  return apiFetch("/relatorios/faturamento-mensal");
}

export async function getKanbanFases() {
  return apiFetch("/relatorios/kanban-fases");
}

export async function getOrcamentosStatus() {
  return apiFetch("/relatorios/orcamentos-status");
}

export async function getMargemFichas() {
  return apiFetch("/relatorios/margem-fichas");
}

export async function getMixProducao() {
  return apiFetch("/relatorios/mix-producao");
}

export async function getPedidosRecentes() {
  return apiFetch("/relatorios/pedidos-recentes");
}

export async function getVendasBI() {
  return apiFetch("/relatorios/vendas-bi");
}

export async function getPCP() {
  return apiFetch("/relatorios/pcp");
}

export async function getPorCliente() {
  return apiFetch("/relatorios/por-cliente");
}

export async function getHistorico(cliente?: string, pedido?: string) {
  const params = new URLSearchParams();
  if (cliente && cliente !== "todos") params.set("cliente", cliente);
  if (pedido  && pedido  !== "todos") params.set("pedido",  pedido);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return apiFetch(`/relatorios/historico${qs}`);
}

export async function getContasReceber() {
  return apiFetch("/relatorios/contas-receber");
}

export async function postFaturarPedido(pedidoId: string, valorFaturado: number) {
  return apiFetch("/relatorios/contas-receber/faturar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pedidoId, valorFaturado }),
  });
}

export async function postDesfaturarPedido(pedidoId: string) {
  return apiFetch("/relatorios/contas-receber/desfaturar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pedidoId }),
  });
}

export async function putValorFaturado(pedidoId: string, valorFaturado: number) {
  return apiFetch("/relatorios/contas-receber/valor-faturado", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pedidoId, valorFaturado }),
  });
}

// ─── Movimentações por código ────────────────────────────────────────────────

export async function getMovimentacoesPorCodigo(codigo: string) {
  return apiFetch(`/kanban/movimentacoes/por-codigo?codigo=${encodeURIComponent(codigo)}`);
}

export async function getMovimentacoesReferencias(cliente?: string) {
  const qs = cliente && cliente !== "todos" ? `?cliente=${encodeURIComponent(cliente)}` : "";
  return apiFetch(`/kanban/movimentacoes/referencias${qs}`);
}

export async function putEditarCMO(movId: string, cmo: number) {
  return apiFetch(`/kanban/movimentacoes/${movId}/cmo`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cmo }),
  });
}

export async function putEditarObservacao(movId: string, observacoes: string) {
  return apiFetch(`/kanban/movimentacoes/${movId}/observacao`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ observacoes }),
  });
}

export async function deleteMovimentacao(movId: string) {
  return apiFetch(`/kanban/movimentacoes/${movId}`, { method: "DELETE" });
}

// ─── Movimentações Horizontal ────────────────────────────────────────────────

export async function getMovimentacoesHorizontal(cliente?: string) {
  const qs = cliente && cliente !== "todos" ? `?cliente=${encodeURIComponent(cliente)}` : "";
  return apiFetch(`/relatorios/movimentacoes-horizontal${qs}`);
}

export async function putCMOFase(referenciaId: string, fase: string, cmo: number) {
  return apiFetch("/relatorios/movimentacoes/cmo-fase", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ referenciaId, fase, cmo }),
  });
}
