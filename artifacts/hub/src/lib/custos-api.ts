import { apiFetch } from "./api";

// ─── ORÇAMENTOS ────────────────────────────────────────────────────────────────

export async function listOrcamentos(status?: string) {
  const params = status ? `?status=${status}` : "";
  return apiFetch(`/custos/orcamentos${params}`);
}

export async function getOrcamento(id: string) {
  return apiFetch(`/custos/orcamentos/${id}`);
}

export async function criarOrcamento(data: {
  nomeCliente: string;
  marca?: string;
  validadeDias?: number;
  prazoEntregaTexto?: string;
  observacoes?: string;
  descontoTipo?: string;
  descontoValor?: number;
}) {
  return apiFetch("/custos/orcamentos", { method: "POST", body: JSON.stringify(data) });
}

export async function criarOrcamentoDasFichas(data: {
  nomeCliente: string;
  marca?: string;
  descricao?: string;
  markup: number;
  observacoes?: string;
  descontoTipo?: string;
  descontoValor?: number;
  fichaIds: string[];
}) {
  return apiFetch("/custos/orcamentos/criar-das-fichas", { method: "POST", body: JSON.stringify(data) });
}

export async function atualizarCliente(id: string, data: { nomeCliente: string; marca?: string }) {
  return apiFetch(`/custos/orcamentos/${id}/cliente`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function atualizarValidade(id: string, data: { validadeDias: number; prazoEntregaTexto?: string; dataEntregaPrevista?: string | null }) {
  return apiFetch(`/custos/orcamentos/${id}/validade`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function atualizarDesconto(id: string, data: { descontoTipo?: string; descontoValor?: number; observacoes?: string }) {
  return apiFetch(`/custos/orcamentos/${id}/desconto`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function atualizarPagamento(id: string, data: {
  percentualSinal: number; tipoSinal: string;
  percentualRetirada: number; tipoRetirada: string;
  percentualPrazo: number; tipoPrazo: string;
}) {
  return apiFetch(`/custos/orcamentos/${id}/pagamento`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function getParcelas(orcamentoId: string) {
  return apiFetch(`/custos/orcamentos/${orcamentoId}/parcelas`);
}

export async function salvarParcelas(orcamentoId: string, parcelas: Array<{ titulo: string; tipo: string; valor: number }>) {
  return apiFetch(`/custos/orcamentos/${orcamentoId}/parcelas`, {
    method: "PUT",
    body: JSON.stringify({ parcelas }),
  });
}

export async function atualizarStatus(id: string, status: string) {
  return apiFetch(`/custos/orcamentos/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export async function deletarOrcamento(id: string) {
  return apiFetch(`/custos/orcamentos/${id}`, { method: "DELETE" });
}

export async function enviarParaKanban(id: string) {
  return apiFetch(`/custos/orcamentos/${id}/enviar-kanban`, { method: "POST" });
}

// ─── ITENS ────────────────────────────────────────────────────────────────────

export async function adicionarItem(orcamentoId: string, data: {
  referencia?: string; descricao: string; quantidade: number; valorUnitario: number;
  fichaId?: string; custo?: number; markupDivisor?: number; isAviamento?: boolean; isDesenvolvimento?: boolean;
}) {
  return apiFetch(`/custos/orcamentos/${orcamentoId}/itens`, { method: "POST", body: JSON.stringify(data) });
}

export async function editarItem(itemId: string, data: {
  referencia?: string; descricao?: string; quantidade?: number; valorUnitario?: number;
  custo?: number; markupDivisor?: number; isAviamento?: boolean; isDesenvolvimento?: boolean;
}) {
  return apiFetch(`/custos/itens/${itemId}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deletarItem(itemId: string) {
  return apiFetch(`/custos/itens/${itemId}`, { method: "DELETE" });
}

// ─── FICHAS DE CUSTO ──────────────────────────────────────────────────────────

export async function listFichas(params?: { busca?: string; tipo?: string; familia?: string; cliente?: string }) {
  const q = new URLSearchParams();
  if (params?.busca) q.set("busca", params.busca);
  if (params?.tipo) q.set("tipo", params.tipo);
  if (params?.familia) q.set("familia", params.familia);
  if (params?.cliente) q.set("cliente", params.cliente);
  const qs = q.toString() ? `?${q.toString()}` : "";
  return apiFetch(`/custos/fichas${qs}`);
}

export async function getFicha(id: string) {
  return apiFetch(`/custos/fichas/${id}`);
}

export async function getFichasDistinctValues() {
  return apiFetch("/custos/fichas/distinct-values");
}

export async function getCodigoProximo(familia?: string) {
  const q = familia ? `?familia=${encodeURIComponent(familia)}` : "";
  return apiFetch(`/custos/fichas/codigo-proximo${q}`);
}

export async function criarFicha(data: {
  referencia: string; tipo: string; familia: string; cliente: string;
  modelagem?: number; piloto?: number; corte?: number; beneficiamento?: number;
  costura?: number; lavanderia?: number; acabamento?: number; passadoria?: number;
  tecido?: number; aviamento?: number; observacoes?: string; fotoUrl?: string;
}) {
  return apiFetch("/custos/fichas", { method: "POST", body: JSON.stringify(data) });
}

export async function atualizarFicha(id: string, data: Partial<{
  referencia: string; tipo: string; familia: string; cliente: string;
  modelagem: number; piloto: number; corte: number; beneficiamento: number;
  costura: number; lavanderia: number; acabamento: number; passadoria: number;
  tecido: number; aviamento: number; observacoes: string; fotoUrl: string;
}>) {
  return apiFetch(`/custos/fichas/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deletarFicha(id: string) {
  return apiFetch(`/custos/fichas/${id}`, { method: "DELETE" });
}

export async function duplicarFicha(id: string) {
  return apiFetch(`/custos/fichas/${id}/duplicar`, { method: "POST", body: JSON.stringify({}) });
}
