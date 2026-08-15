import { useState, useRef } from "react";
import FinanceiroLayout from "@/components/financeiro/FinanceiroLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Zap, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Transacao { id: number; data: string; descricao: string; valor: string; tipo: "CREDITO" | "DEBITO"; categoriaId?: string; status: string; }
interface Categoria { id: string; nome: string; naturezaPadrao: string; centroCustoPadrao: string; }
interface RegraDialog { descricao: string; categoriaId: string; natureza: string; centroCusto: string; }

const fmt = (v: string) => parseFloat(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function extrairTermo(desc: string): string {
  const noise = /^(PIX\s+CRED\s+|PIX\s+DEB\s+|PIX\s+|TED\s+|DOC\s+|PAGAMENTO\s+|PAGTO\s+|DEBITO\s+|CREDITO\s+|CRED\s+|DEB\s+|TRANSF\s+|TRANSFERENCIA\s+|SAQUE\s+|DEPOSITO\s+)/i;
  const clean = desc.replace(noise, "").trim();
  return clean.split(/\s+/).slice(0, 3).join(" ").substring(0, 30).toUpperCase();
}

export default function Classificar() {
  const qc = useQueryClient();
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [catMassa, setCatMassa] = useState("");
  const [regraDialog, setRegraDialog] = useState<RegraDialog | null>(null);
  const [termoInput, setTermoInput] = useState("");
  const skipDialog = useRef(false);

  const { data: transacoes = [] } = useQuery<Transacao[]>({ queryKey: ["fin-transacoes"], queryFn: () => apiFetch("/financeiro/transacoes") });
  const { data: categorias = [] } = useQuery<Categoria[]>({ queryKey: ["fin-categorias"], queryFn: () => apiFetch("/financeiro/categorias") });

  const pendentes = transacoes.filter(t => t.status === "pendente");
  const categoriasOrdenadas = [...categorias].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const classifMut = useMutation({
    mutationFn: ({ id, categoriaId, descricao }: { id: number; categoriaId: string; descricao: string }) => {
      const cat = categorias.find(c => c.id === categoriaId);
      return apiFetch(`/financeiro/transacoes/${id}`, { method: "PUT", body: JSON.stringify({ categoriaId, natureza: cat?.naturezaPadrao, centroCusto: cat?.centroCustoPadrao }) });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["fin-transacoes"] });
      if (!skipDialog.current) {
        const cat = categorias.find(c => c.id === vars.categoriaId);
        const termo = extrairTermo(vars.descricao);
        setTermoInput(termo);
        setRegraDialog({
          descricao: vars.descricao,
          categoriaId: vars.categoriaId,
          natureza: cat?.naturezaPadrao ?? "",
          centroCusto: cat?.centroCustoPadrao ?? "",
        });
      }
    },
  });

  const regrasMut = useMutation({
    mutationFn: () => apiFetch("/financeiro/transacoes/aplicar-regras", { method: "POST", body: "{}" }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["fin-transacoes"] });
      toast.success(`${res.aplicadas} transações classificadas automaticamente`);
    },
  });

  const criarRegraMut = useMutation({
    mutationFn: (d: object) => apiFetch("/financeiro/regras", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => {
      toast.success("Regra criada! Próximas importações serão classificadas automaticamente.");
      setRegraDialog(null);
    },
    onError: () => toast.error("Erro ao criar regra — termo muito curto ou já existe"),
  });

  const movMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/financeiro/transacoes/${id}`, { method: "PUT", body: JSON.stringify({ natureza: "Movimentação Financeira" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fin-transacoes"] }),
    onError: () => toast.error("Erro ao marcar"),
  });

  const aplicarMassa = async () => {
    if (!catMassa || selecionados.length === 0) return;
    skipDialog.current = true;
    const itens = pendentes.filter(t => selecionados.includes(t.id));
    await Promise.all(itens.map(t => classifMut.mutateAsync({ id: t.id, categoriaId: catMassa, descricao: t.descricao })));
    skipDialog.current = false;
    toast.success(`${selecionados.length} transações classificadas`);
    setSelecionados([]);
    setCatMassa("");
  };

  const marcarMassaTransf = async () => {
    if (selecionados.length === 0) return;
    await Promise.all(selecionados.map(id => movMut.mutateAsync(id)));
    toast.success(`${selecionados.length} marcadas como Movimentação Financeira`);
    setSelecionados([]);
  };

  const toggleSel = (id: number) =>
    setSelecionados(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

  const toggleAll = () =>
    setSelecionados(selecionados.length === pendentes.length ? [] : pendentes.map(t => t.id));

  return (
    <FinanceiroLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Classificar</h1>
            <p className="text-sm text-muted-foreground">{pendentes.length} transação(ões) pendente(s)</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => regrasMut.mutate()} disabled={regrasMut.isPending}>
            <Zap className="w-4 h-4 mr-1" /> Aplicar regras
          </Button>
        </div>

        {pendentes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
            <p className="font-medium">Tudo classificado!</p>
            <p className="text-sm text-muted-foreground">Nenhuma transação pendente.</p>
          </div>
        ) : (
          <>
            {/* Ação em massa */}
            {selecionados.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-blue-700">{selecionados.length} selecionados</span>
                <Select value={catMassa} onValueChange={setCatMassa}>
                  <SelectTrigger className="flex-1 max-w-[250px] h-8 text-sm"><SelectValue placeholder="Categoria para todos..." /></SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">{categoriasOrdenadas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" disabled={!catMassa || classifMut.isPending} onClick={aplicarMassa}>Aplicar</Button>
                <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100"
                  disabled={movMut.isPending} onClick={marcarMassaTransf}>
                  <ArrowLeftRight className="w-3.5 h-3.5 mr-1" /> Movimentação Financeira
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setSelecionados([]); setCatMassa(""); }}>Cancelar</Button>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 w-8">
                      <input type="checkbox" checked={selecionados.length === pendentes.length} onChange={toggleAll} className="rounded" />
                    </th>
                    <th className="text-left px-3 py-2 font-medium">Data</th>
                    <th className="text-left px-3 py-2 font-medium">Descrição</th>
                    <th className="text-right px-3 py-2 font-medium">Valor</th>
                    <th className="text-left px-3 py-2 font-medium w-48">Categoria</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {pendentes.map(t => (
                    <tr key={t.id} className={cn("border-t hover:bg-muted/20", selecionados.includes(t.id) && "bg-blue-50/50")}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selecionados.includes(t.id)} onChange={() => toggleSel(t.id)} className="rounded" />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{t.data}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate" title={t.descricao}>{t.descricao}</td>
                      <td className={cn("px-3 py-2 text-right font-semibold whitespace-nowrap tabular-nums", t.tipo === "CREDITO" ? "text-emerald-600" : "text-red-500")}>
                        {t.tipo === "CREDITO" ? "+" : "-"}{fmt(t.valor)}
                      </td>
                      <td className="px-3 py-2">
                        <Select onValueChange={catId => classifMut.mutate({ id: t.id, categoriaId: catId, descricao: t.descricao })}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Escolher..." /></SelectTrigger>
                          <SelectContent className="max-h-64 overflow-y-auto">{categoriasOrdenadas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost" size="icon"
                          className="w-7 h-7 text-muted-foreground hover:text-amber-600"
                          title="Marcar como Movimentação Financeira / Transferência (não entra no P&L)"
                          onClick={() => movMut.mutate(t.id)}
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Dialog: Criar regra automática */}
      <Dialog open={!!regraDialog} onOpenChange={open => !open && setRegraDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar regra automática?</DialogTitle>
            <DialogDescription>
              Defina um termo para que futuras transações com essa descrição sejam classificadas automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded font-mono truncate" title={regraDialog?.descricao}>
              {regraDialog?.descricao}
            </div>
            <div>
              <Label className="text-xs mb-1 block">Termo de identificação</Label>
              <Input
                value={termoInput}
                onChange={e => setTermoInput(e.target.value.toUpperCase())}
                placeholder="Ex: POSTO, CORREIOS, AVIAMENTOS..."
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Toda transação que contiver esse termo será classificada na mesma categoria automaticamente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegraDialog(null)}>Não, obrigado</Button>
            <Button
              disabled={termoInput.trim().length < 3 || criarRegraMut.isPending}
              onClick={() => criarRegraMut.mutate({
                termo: termoInput.trim(),
                categoriaId: regraDialog!.categoriaId,
                natureza: regraDialog!.natureza,
                centroCusto: regraDialog!.centroCusto,
              })}
            >
              Criar regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
