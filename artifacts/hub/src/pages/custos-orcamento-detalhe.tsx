import { useState } from "react";
import { useLocation, useParams } from "wouter";
import KanbanLayout from "@/components/kanban/KanbanLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { printOrcamento } from "@/lib/print-orcamento";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Download, Printer, Send, Trash2, Edit2, Plus, RotateCcw } from "lucide-react";
import CustosNav from "@/components/orcamento/CustosNav";
import {
  getOrcamento, atualizarCliente, atualizarValidade, atualizarDesconto,
  atualizarStatus, adicionarItem, editarItem, deletarItem, enviarParaKanban,
  getParcelas, salvarParcelas,
} from "@/lib/custos-api";
import AdicionarItemManual from "@/components/orcamento/AdicionarItemManual";
import EditarItemOrcamento from "@/components/orcamento/EditarItemOrcamento";
import { EditarDescontoModal } from "@/components/orcamento/EditarDescontoModal";
import { EditarObservacoesModal } from "@/components/orcamento/EditarObservacoesModal";

function fmt(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | Date | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR");
}

export default function CustosOrcamentoDetalhe() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const orcId = params.id!;
  const qc = useQueryClient();

  const { data: orcamento, isLoading } = useQuery<any>({
    queryKey: ["orcamento", orcId],
    queryFn: () => getOrcamento(orcId),
  });

  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [enviandoKanban, setEnviandoKanban] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const [editingClienteMarca, setEditingClienteMarca] = useState(false);
  const [nomeClienteEdit, setNomeClienteEdit] = useState("");
  const [marcaEdit, setMarcaEdit] = useState("");

  const [editingValidadeEPrazo, setEditingValidadeEPrazo] = useState(false);
  const [validadeEdit, setValidadeEdit] = useState("");
  const [prazoEdit, setPrazoEdit] = useState("");
  const [dataEntregaEdit, setDataEntregaEdit] = useState("");

  const [editingParcelas, setEditingParcelas] = useState(false);
  const [parcelasEdit, setParcelasEdit] = useState<Array<{ titulo: string; tipo: "percentual" | "valor"; valor: string }>>([]);
  const [savingParcelas, setSavingParcelas] = useState(false);

  const [showEditarDescontoModal, setShowEditarDescontoModal] = useState(false);
  const [showEditarObservacoesModal, setShowEditarObservacoesModal] = useState(false);
  const [editingObservacoes, setEditingObservacoes] = useState(false);
  const [observacoesEdit, setObservacoesEdit] = useState("");
  const [savingObservacoes, setSavingObservacoes] = useState(false);

  const [saving, setSaving] = useState(false);

  const { data: empresa } = useQuery<any>({
    queryKey: ["empresa"],
    queryFn: () => apiFetch('/tenants/empresa'),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const { data: parcelasDB = [] } = useQuery<any[]>({
    queryKey: ["orcamento-parcelas", orcId],
    queryFn: () => getParcelas(orcId),
    staleTime: 30 * 1000,
  });

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ["orcamento", orcId] });
    qc.invalidateQueries({ queryKey: ["orcamento-parcelas", orcId] });
  };

  if (isLoading) {
    return (
      <>
        <CustosNav />
        <div className="container py-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  if (!orcamento) {
    return (
      <>
        <CustosNav />
        <div className="container py-8">
          <Button variant="ghost" onClick={() => navigate("/hub/custos/orcamentos")} className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Orçamento não encontrado</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const o = orcamento as any;
  const itens: any[] = o.itens ?? [];

  const totalPecas = itens.reduce((sum: number, item: any) => sum + Number(item.quantidade), 0);
  const subtotal = itens.reduce((sum: number, item: any) => sum + Number(item.valorTotal ?? item.total ?? 0), 0);

  let valorDesconto = 0;
  if (o.descontoValor && Number(o.descontoValor) > 0) {
    if (o.descontoTipo === "percentual") {
      valorDesconto = (subtotal * Number(o.descontoValor)) / 100;
    } else {
      valorDesconto = Number(o.descontoValor);
    }
  }
  const total = subtotal - valorDesconto;

  let valorSinal = 0;
  if (o.tipoSinal === "valor") valorSinal = Number(o.percentualSinal);
  else valorSinal = (total * Number(o.percentualSinal)) / 100;

  let valorRetirada = 0;
  if (o.tipoRetirada === "valor") valorRetirada = Number(o.percentualRetirada);
  else valorRetirada = (total * Number(o.percentualRetirada)) / 100;

  let valorPrazo = 0;
  if (o.tipoPrazo === "valor") valorPrazo = Number(o.percentualPrazo);
  else valorPrazo = (total * Number(o.percentualPrazo)) / 100;

  const handleSalvarClienteMarca = async () => {
    if (!nomeClienteEdit || !marcaEdit) { toast.error("Preencha cliente e marca!"); return; }
    setSaving(true);
    try {
      await atualizarCliente(o.id, { nomeCliente: nomeClienteEdit, marca: marcaEdit });
      refetch(); setEditingClienteMarca(false);
      toast.success("Cliente e marca atualizados!");
    } catch (err: any) { toast.error(err.message ?? "Erro"); }
    finally { setSaving(false); }
  };

  const handleSalvarValidadeEPrazo = async () => {
    if (!validadeEdit) { toast.error("Preencha a validade!"); return; }
    setSaving(true);
    try {
      await atualizarValidade(o.id, {
        validadeDias: parseInt(validadeEdit),
        prazoEntregaTexto: prazoEdit || undefined,
        dataEntregaPrevista: dataEntregaEdit || null,
      });
      refetch(); setEditingValidadeEPrazo(false);
      toast.success("Validade e prazo atualizados!");
    } catch (err: any) { toast.error(err.message ?? "Erro"); }
    finally { setSaving(false); }
  };

  const handleAbrirEdicaoParcelas = () => {
    if (parcelasDB.length > 0) {
      setParcelasEdit(parcelasDB.map((p: any) => ({
        titulo: p.titulo,
        tipo: p.tipo as "percentual" | "valor",
        valor: String(p.valor),
      })));
    } else {
      setParcelasEdit([
        { titulo: "Sinal", tipo: "percentual", valor: String(o.percentualSinal ?? 50) },
        { titulo: "Retirada", tipo: "percentual", valor: String(o.percentualRetirada ?? 50) },
      ]);
    }
    setEditingParcelas(true);
  };

  const handleSalvarParcelas = async () => {
    if (parcelasEdit.length === 0) { toast.error("Adicione ao menos uma parcela."); return; }
    const hasEmpty = parcelasEdit.some(p => !p.titulo.trim() || p.valor === "" || isNaN(Number(p.valor)));
    if (hasEmpty) { toast.error("Preencha título e valor em todas as parcelas."); return; }

    const toReais = (p: { tipo: "percentual" | "valor"; valor: string }) =>
      p.tipo === "valor" ? Number(p.valor) : (total * Number(p.valor)) / 100;

    const soma = parcelasEdit.reduce((s, p) => s + toReais(p), 0);
    if (Math.abs(soma - total) > 0.01) {
      const diff = soma < total ? `faltam ${fmt(total - soma)}` : `sobram ${fmt(soma - total)}`;
      toast.error(`Soma das parcelas = ${fmt(soma)}, mas o total do orçamento é ${fmt(total)} (${diff}).`);
      return;
    }

    setSavingParcelas(true);
    try {
      await salvarParcelas(o.id, parcelasEdit.map(p => ({
        titulo: p.titulo,
        tipo: p.tipo,
        valor: Number(p.valor),
      })));
      refetch();
      setEditingParcelas(false);
      toast.success("Condições de pagamento salvas!");
    } catch (err: any) { toast.error(err.message ?? "Erro"); }
    finally { setSavingParcelas(false); }
  };

  const handleSalvarObservacoesInline = async () => {
    setSavingObservacoes(true);
    try {
      await atualizarDesconto(o.id, { observacoes: observacoesEdit });
      refetch();
      setEditingObservacoes(false);
      toast.success("Observações salvas!");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar observações");
    } finally {
      setSavingObservacoes(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Tem certeza que deseja deletar este item?")) return;
    setDeletingItemId(itemId);
    try {
      await deletarItem(itemId);
      refetch();
    } catch (err: any) { toast.error(err.message ?? "Erro ao deletar item"); }
    finally { setDeletingItemId(null); }
  };

  const handleEnviarKanban = async () => {
    setEnviandoKanban(true);
    try {
      await enviarParaKanban(o.id);
      toast.success("Orçamento enviado para o Kanban com sucesso!");
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar para Kanban");
    } finally {
      setEnviandoKanban(false);
    }
  };

  const handleReverterParaPendente = async () => {
    if (!confirm("Reverter este orçamento para Pendente? O vínculo com o Kanban também será desfeito.")) return;
    try {
      await atualizarStatus(o.id, "pendente");
      toast.success("Orçamento revertido para Pendente.");
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao reverter status");
    }
  };

  return (
    <KanbanLayout>
      <CustosNav />

      {/* ─── Versão de Tela (oculta no print) ─── */}
      <div className="px-6 py-8 print:hidden">
        {/* Navegação */}
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" onClick={() => navigate("/hub/custos/orcamentos")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => printOrcamento({ ...o, parcelas: parcelasDB }, empresa)} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
            <Button variant="outline" onClick={() => printOrcamento({ ...o, parcelas: parcelasDB }, empresa)} className="gap-2">
              <Download className="h-4 w-4" /> PDF
            </Button>
            {o.status === "aprovado" && !o.enviado && !o.enviadoParaKanban && (
              <Button onClick={handleEnviarKanban} disabled={enviandoKanban} className="gap-2 bg-green-600 hover:bg-green-700">
                <Send className="h-4 w-4" />
                {enviandoKanban ? "Enviando..." : "Enviar para Kanban"}
              </Button>
            )}
            {(o.enviado || o.enviadoParaKanban) && (
              <Button disabled variant="outline" className="gap-2">
                <Send className="h-4 w-4" /> Enviado para Kanban ✓
              </Button>
            )}
            {o.status === "aprovado" && (
              <Button onClick={handleReverterParaPendente} variant="outline" className="gap-2 text-amber-600 border-amber-300 hover:bg-amber-50">
                <RotateCcw className="h-4 w-4" /> Reverter para Pendente
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Dados do Cliente */}
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-base">Dados do Cliente</CardTitle>
              {!editingClienteMarca && (
                <Button size="sm" variant="outline" onClick={() => {
                  setNomeClienteEdit(o.nomeCliente);
                  setMarcaEdit(o.marca ?? "");
                  setEditingClienteMarca(true);
                }} className="gap-2">
                  <Edit2 className="h-4 w-4" /> Editar
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {editingClienteMarca ? (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label htmlFor="nomeClienteEdit">Cliente</Label>
                    <Input id="nomeClienteEdit" value={nomeClienteEdit} onChange={(e) => setNomeClienteEdit(e.target.value)} placeholder="Nome do cliente" />
                  </div>
                  <div>
                    <Label htmlFor="marcaEdit">Marca/Coleção</Label>
                    <Input id="marcaEdit" value={marcaEdit} onChange={(e) => setMarcaEdit(e.target.value)} placeholder="Marca ou coleção" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSalvarClienteMarca} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingClienteMarca(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p><strong>Cliente:</strong> {o.nomeCliente}</p>
                  <p><strong>Marca/Coleção:</strong> {o.marca || "—"}</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Validade e Prazo */}
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-base">Validade e Prazo</CardTitle>
              {!editingValidadeEPrazo && (
                <Button size="sm" variant="outline" onClick={() => {
                  setValidadeEdit((o.validade ?? o.validadeDias ?? 30).toString());
                  setPrazoEdit(o.prazoEntregaTexto || "");
                  setDataEntregaEdit(o.dataEntregaPrevista || "");
                  setEditingValidadeEPrazo(true);
                }} className="gap-2">
                  <Edit2 className="h-4 w-4" /> Editar
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {editingValidadeEPrazo ? (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label htmlFor="validadeEdit">Validade (dias)</Label>
                    <Input id="validadeEdit" type="number" value={validadeEdit} onChange={(e) => setValidadeEdit(e.target.value)} placeholder="Ex: 30" />
                  </div>
                  <div>
                    <Label htmlFor="prazoEdit">Prazo de Entrega (texto para PDF)</Label>
                    <Input id="prazoEdit" value={prazoEdit} onChange={(e) => setPrazoEdit(e.target.value)} placeholder="Ex: 15 dias uteis" />
                  </div>
                  <div>
                    <Label htmlFor="dataEntregaEdit">Data de Entrega Prevista</Label>
                    <Input id="dataEntregaEdit" type="date" value={dataEntregaEdit} onChange={(e) => setDataEntregaEdit(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSalvarValidadeEPrazo} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingValidadeEPrazo(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p><strong>Validade do Orçamento:</strong> {o.validade ?? o.validadeDias} dias</p>
                  <p><strong>Prazo de Entrega:</strong> {o.prazoEntregaTexto || (o.prazoDias ? `${o.prazoDias} dias` : "—")}</p>
                  <p><strong>Data de Entrega Prevista:</strong> {o.dataEntregaPrevista ? new Date(o.dataEntregaPrevista + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Itens do Orçamento */}
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-base">Itens do Orçamento</CardTitle>
              {!showAddItem && (
                <Button size="sm" onClick={() => setShowAddItem(true)}>+ Adicionar Item</Button>
              )}
            </CardHeader>
            <CardContent>
              {showAddItem && (
                <div className="mb-6">
                  <AdicionarItemManual
                    orcamentoId={o.id}
                    onSuccess={() => { setShowAddItem(false); refetch(); }}
                    onCancel={() => setShowAddItem(false)}
                  />
                </div>
              )}

              {itens.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum item adicionado ainda</p>
              ) : (
                <div className="w-full">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Referência</th>
                        <th className="text-left py-2 px-2">Descrição</th>
                        <th className="text-right py-2 px-2">Quantidade</th>
                        <th className="text-right py-2 px-2">Valor Unitário</th>
                        <th className="text-right py-2 px-2">Total</th>
                        <th className="text-center py-2 px-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item: any) => (
                        <tr key={item.id} className="border-b hover:bg-muted">
                          <td className="py-2 px-2">{item.referencia || "—"}</td>
                          <td className="py-2 px-2">{item.descricao}</td>
                          <td className="text-right py-2 px-2">{item.quantidade}</td>
                          <td className="text-right py-2 px-2">{fmt(Number(item.valorUnitario))}</td>
                          <td className="text-right py-2 px-2 font-semibold">{fmt(Number(item.valorTotal ?? item.total ?? 0))}</td>
                          <td className="text-center py-2 px-2">
                            <div className="flex gap-1 justify-center">
                              <Button variant="ghost" size="sm" onClick={() => setEditingItem(item)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteItem(item.id)}
                                disabled={deletingItemId === item.id}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totais */}
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-base">Totais</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowEditarDescontoModal(true)} className="gap-2">
                <Edit2 className="h-4 w-4" /> Editar Desconto
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total de Peças:</span>
                  <span className="font-semibold">{totalPecas} unidades</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{fmt(subtotal)}</span>
                </div>
                {Number(o.descontoValor ?? 0) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Desconto ({o.descontoTipo === "percentual" ? `${o.descontoValor}%` : "Valor fixo"}):</span>
                    <span className="font-semibold">-{fmt(valorDesconto)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>VALOR TOTAL:</span>
                  <span>{fmt(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="flex flex-row justify-between items-center pb-2">
              <CardTitle className="text-base text-blue-900">Observações</CardTitle>
              <div className="flex gap-2">
                {!editingObservacoes ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => {
                      setObservacoesEdit(o.observacoes ?? "");
                      setEditingObservacoes(true);
                    }} className="gap-1.5 h-7 text-xs">
                      <Edit2 className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowEditarObservacoesModal(true)} className="gap-1.5 h-7 text-xs text-muted-foreground">
                      Templates
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditingObservacoes(false)} className="h-7 text-xs">Cancelar</Button>
                    <Button size="sm" onClick={handleSalvarObservacoesInline} disabled={savingObservacoes} className="h-7 text-xs">
                      {savingObservacoes ? "Salvando..." : "Salvar"}
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingObservacoes ? (
                <textarea
                  value={observacoesEdit}
                  onChange={(e) => setObservacoesEdit(e.target.value)}
                  placeholder="Digite as observações deste orçamento..."
                  rows={5}
                  className="w-full text-sm border border-blue-200 rounded-md p-2 bg-white resize-y focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              ) : o.observacoes ? (
                <p className="text-sm whitespace-pre-wrap text-gray-700">{o.observacoes}</p>
              ) : (
                <p className="text-sm text-gray-400 italic cursor-pointer hover:text-gray-600 transition-colors" onClick={() => { setObservacoesEdit(""); setEditingObservacoes(true); }}>
                  Clique aqui ou em "Editar" para adicionar observações...
                </p>
              )}
            </CardContent>
          </Card>

          {/* Condições de Pagamento */}
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-base">Condições de Pagamento</CardTitle>
              {!editingParcelas && (
                <Button size="sm" variant="outline" onClick={handleAbrirEdicaoParcelas} className="gap-2">
                  <Edit2 className="h-4 w-4" /> Editar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingParcelas ? (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  {parcelasEdit.map((p, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1 min-w-0">
                        <Label className="text-xs text-muted-foreground">Título</Label>
                        <Input
                          value={p.titulo}
                          onChange={(e) => {
                            const next = [...parcelasEdit];
                            next[idx] = { ...next[idx], titulo: e.target.value };
                            setParcelasEdit(next);
                          }}
                          placeholder="Ex: Sinal, Piloto, Retirada..."
                        />
                      </div>
                      <div className="w-28">
                        <Label className="text-xs text-muted-foreground">Valor</Label>
                        <Input
                          type="number"
                          value={p.valor}
                          onChange={(e) => {
                            const next = [...parcelasEdit];
                            next[idx] = { ...next[idx], valor: e.target.value };
                            setParcelasEdit(next);
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div className="w-20">
                        <Label className="text-xs text-muted-foreground">Tipo</Label>
                        <Select value={p.tipo} onValueChange={(v) => {
                          const next = [...parcelasEdit];
                          next[idx] = { ...next[idx], tipo: v as "percentual" | "valor" };
                          setParcelasEdit(next);
                        }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentual">%</SelectItem>
                            <SelectItem value="valor">R$</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive mb-0.5"
                        onClick={() => setParcelasEdit(parcelasEdit.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {/* Resumo de distribuição */}
                  {(() => {
                    const toReais = (p: { tipo: "percentual" | "valor"; valor: string }) =>
                      p.tipo === "valor" ? Number(p.valor) : (total * Number(p.valor || 0)) / 100;
                    const soma = parcelasEdit.reduce((s, p) => s + toReais(p), 0);
                    const diff = total - soma;
                    const ok = Math.abs(diff) < 0.01;
                    return (
                      <div className={`text-xs font-medium px-2 py-1 rounded ${ok ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        Distribuído: {fmt(soma)} de {fmt(total)}
                        {!ok && ` — ${diff > 0 ? `faltam ${fmt(diff)}` : `sobram ${fmt(-diff)}`}`}
                        {ok && " ✓"}
                      </div>
                    );
                  })()}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setParcelasEdit([...parcelasEdit, { titulo: "", tipo: "percentual", valor: "" }])}
                    className="gap-1.5 w-full"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar parcela
                  </Button>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" onClick={handleSalvarParcelas} disabled={savingParcelas}>
                      {savingParcelas ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingParcelas(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 text-sm">
                  {parcelasDB.length > 0 ? (
                    parcelasDB.map((p: any, idx: number) => {
                      const v = p.tipo === "valor" ? Number(p.valor) : (total * Number(p.valor)) / 100;
                      const label = p.tipo === "valor"
                        ? `R$ ${Number(p.valor).toFixed(2).replace(".", ",")}`
                        : `${p.valor}%`;
                      return (
                        <p key={idx}><strong>{p.titulo} ({label}):</strong> {fmt(v)}</p>
                      );
                    })
                  ) : (
                    <>
                      <p><strong>Sinal:</strong> {o.tipoSinal === "valor" ? `R$ ${Number(o.percentualSinal).toFixed(2).replace(".", ",")}` : `${o.percentualSinal}%`} = {fmt(valorSinal)}</p>
                      <p><strong>Retirada:</strong> {o.tipoRetirada === "valor" ? `R$ ${Number(o.percentualRetirada).toFixed(2).replace(".", ",")}` : `${o.percentualRetirada}%`} = {fmt(valorRetirada)}</p>
                      {Number(o.percentualPrazo ?? 0) > 0 && (
                        <p><strong>Prazo:</strong> {o.tipoPrazo === "valor" ? `R$ ${Number(o.percentualPrazo).toFixed(2).replace(".", ",")}` : `${o.percentualPrazo}%`} = {fmt(valorPrazo)}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2 italic">Clique em Editar para criar parcelas personalizadas.</p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Versão para Impressão (PDF) ─── */}
      <div className="hidden print:block print-preview-container">

        {/* Cabeçalho: logo + empresa (esq) | número + data (dir) */}
        <div className="orc-header">
          <div className="orc-header-left">
            {empresa?.logo_url && (
              <img src={empresa.logo_url} alt="Logo" className="orc-logo" />
            )}
            <div>
              <p className="orc-company-name">{empresa?.nome_empresa || ""}</p>
              {empresa?.endereco && <p className="orc-company-address">{empresa.endereco}{empresa?.cidade_estado_cep ? ` - ${empresa.cidade_estado_cep}` : ""}</p>}
            </div>
          </div>
          <div className="orc-header-right">
            <div className="orc-number">{o.numeroOrcamento ?? o.numero}</div>
            <div className="orc-date">{formatDate(o.dataEmissao ?? o.createdAt)}</div>
          </div>
        </div>

        {/* Dados do Cliente */}
        <div className="orc-section">
          <div className="orc-section-title">Dados do Cliente</div>
          <div className="orc-client-grid">
            <div><span>Cliente: </span><strong>{o.nomeCliente}</strong></div>
            <div><span>Marca/Coleção: </span><strong>{o.marca || "—"}</strong></div>
            <div><span>Validade: </span><strong>{o.validade ?? o.validadeDias} dias</strong></div>
            <div><span>Prazo de Entrega: </span><strong>{o.prazoEntregaTexto || (o.prazoDias ? `${o.prazoDias} dias` : "—")}</strong></div>
          </div>
        </div>

        {/* Itens */}
        <div className="orc-section">
          <div className="orc-section-title">Itens do Orçamento</div>
          <table className="orc-table">
            <thead>
              <tr>
                <th style={{ width: "15%" }}>Referência</th>
                <th style={{ width: "35%" }}>Descrição</th>
                <th className="right" style={{ width: "8%" }}>QTD.</th>
                <th className="right" style={{ width: "16%" }}>VLR. UNIT.</th>
                <th className="right" style={{ width: "26%" }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.referencia || "—"}</td>
                  <td>{item.descricao}</td>
                  <td className="right">{item.quantidade}</td>
                  <td className="right">{fmt(Number(item.valorUnitario))}</td>
                  <td className="right">{fmt(Number(item.valorTotal ?? item.total ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totais */}
        <div className="orc-totals">
          <div className="orc-totals-row">
            <span>Total de Peças:</span>
            <strong>{totalPecas} unidades</strong>
          </div>
          <div className="orc-totals-row">
            <span>Subtotal:</span>
            <strong>{fmt(subtotal)}</strong>
          </div>
          {Number(o.descontoValor ?? 0) > 0 && (
            <div className="orc-totals-row">
              <span>Desconto ({o.descontoTipo === "percentual" ? `${o.descontoValor}%` : "Valor fixo"}):</span>
              <strong>-{fmt(valorDesconto)}</strong>
            </div>
          )}
          <div className="orc-totals-row total-final">
            <span>VALOR TOTAL:</span>
            <span>{fmt(total)}</span>
          </div>
        </div>

        {/* Observações */}
        {o.observacoes && (
          <div className="orc-obs">
            <div className="orc-obs-title">Observações</div>
            <div className="orc-obs-text">{o.observacoes}</div>
          </div>
        )}

        {/* Condições de Pagamento */}
        <div className="orc-payment">
          <div className="orc-payment-title">Condições de Pagamento</div>
          {parcelasDB.length > 0 ? (
            parcelasDB.map((p: any, idx: number) => {
              const v = p.tipo === "valor" ? Number(p.valor) : (total * Number(p.valor)) / 100;
              const label = p.tipo === "valor"
                ? `R$ ${Number(p.valor).toFixed(2).replace(".", ",")}`
                : `${p.valor}%`;
              return (
                <div key={idx} className="orc-payment-row">
                  <span><strong>{p.titulo} ({label}):</strong></span>
                  <span>{fmt(v)}</span>
                </div>
              );
            })
          ) : (
            <>
              <div className="orc-payment-row">
                <span><strong>Sinal ({o.tipoSinal === "valor" ? `R$ ${Number(o.percentualSinal).toFixed(2).replace(".", ",")}` : `${o.percentualSinal}%`}):</strong></span>
                <span>{fmt(valorSinal)}</span>
              </div>
              <div className="orc-payment-row">
                <span><strong>Retirada ({o.tipoRetirada === "valor" ? `R$ ${Number(o.percentualRetirada).toFixed(2).replace(".", ",")}` : `${o.percentualRetirada}%`}):</strong></span>
                <span>{fmt(valorRetirada)}</span>
              </div>
              {Number(o.percentualPrazo ?? 0) > 0 && (
                <div className="orc-payment-row">
                  <span><strong>Prazo ({o.tipoPrazo === "valor" ? `R$ ${Number(o.percentualPrazo).toFixed(2).replace(".", ",")}` : `${o.percentualPrazo}%`}):</strong></span>
                  <span>{fmt(valorPrazo)}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé */}
        <div className="orc-footer">
          {(empresa?.pix || empresa?.cnpj || empresa?.email || empresa?.site) && (
            <div className="footer-main">
              {empresa?.pix && <span>PIX (CNPJ): {empresa.pix}</span>}
              {empresa?.email && <span>{empresa?.pix ? " | " : ""}Email: {empresa.email}</span>}
              {empresa?.site && <span>{(empresa?.pix || empresa?.email) ? " | " : ""}Site: {empresa.site}</span>}
            </div>
          )}
          <div>Este orçamento é válido por {o.validade ?? o.validadeDias} dias a partir da data de emissão.</div>
        </div>
      </div>

      {/* Dialog: Editar Item */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Item</DialogTitle></DialogHeader>
            <EditarItemOrcamento
              item={editingItem}
              orcamentoId={o.id}
              onSuccess={() => { setEditingItem(null); refetch(); }}
              onCancel={() => setEditingItem(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Editar Desconto */}
      <EditarDescontoModal
        open={showEditarDescontoModal}
        onClose={() => setShowEditarDescontoModal(false)}
        orcamentoId={o.id}
        descontoTipoAtual={o.descontoTipo}
        descontoValorAtual={Number(o.descontoValor ?? 0)}
      />

      {/* Modal: Editar Observações */}
      <EditarObservacoesModal
        open={showEditarObservacoesModal}
        onClose={() => setShowEditarObservacoesModal(false)}
        orcamentoId={o.id}
        observacoesAtuais={o.observacoes ?? undefined}
      />
    </KanbanLayout>
  );
}
