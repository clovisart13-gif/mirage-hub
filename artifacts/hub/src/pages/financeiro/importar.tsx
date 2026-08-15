import { useState, useRef } from "react";
import FinanceiroLayout from "@/components/financeiro/FinanceiroLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, FileText, CheckCircle2, Plus, History, Building2, AlertTriangle, TrendingUp, TrendingDown, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Conta { id: number; nome: string; banco: string; tipo: string; }
interface OFXTx { data: string; descricao: string; valor: number; tipo: "CREDITO" | "DEBITO"; fitId?: string; }

const fmt   = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDt = (s: string) => s; // já vem no formato dd/mm/yyyy do parser

export default function Importar() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive]   = useState(false);
  const [file, setFile]               = useState<File | null>(null);
  const [contaId, setContaId]         = useState<string>("");
  const [parsed, setParsed]           = useState<OFXTx[] | null>(null);
  const [formato, setFormato]         = useState<string>("");
  const [loading, setLoading]         = useState(false);
  const [novaContaOpen, setNovaContaOpen] = useState(false);
  const [novaConta, setNovaConta]     = useState({ nome: "", banco: "", tipo: "Corrente" as const });
  const [showAll, setShowAll]         = useState(false);

  const { data: contas = [] } = useQuery<Conta[]>({ queryKey: ["fin-contas"], queryFn: () => apiFetch("/financeiro/contas") });
  const { data: historico = [] } = useQuery<any[]>({ queryKey: ["fin-historico"], queryFn: () => apiFetch("/financeiro/historico-importacoes") });

  const criarContaMut = useMutation({
    mutationFn: (data: any) => apiFetch("/financeiro/contas", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fin-contas"] });
      setNovaContaOpen(false);
      setNovaConta({ nome: "", banco: "", tipo: "Corrente" });
      toast.success("Conta criada!");
    },
  });

  const batchMut = useMutation({
    mutationFn: (data: any) => apiFetch("/financeiro/transacoes/batch", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["fin-transacoes"] });
      qc.invalidateQueries({ queryKey: ["financeiro-dashboard"] });
      apiFetch("/financeiro/historico-importacoes", {
        method: "POST",
        body: JSON.stringify({
          nomeArquivo: file!.name,
          contaId: contaId ? parseInt(contaId) : undefined,
          quantidadeTransacoes: res.count,
        }),
      });
      qc.invalidateQueries({ queryKey: ["fin-historico"] });

      if (res.duplicadas > 0 && res.count === 0) {
        toast.warning(`Nenhuma transação nova — ${res.duplicadas} já existiam no banco.`);
      } else if (res.duplicadas > 0) {
        toast.success(`${res.count} importadas · ${res.duplicadas} já existiam (ignoradas)`);
      } else {
        toast.success(`${res.count} transações importadas!`);
      }
      setParsed(null); setFile(null); setContaId(""); setShowAll(false);
    },
  });

  const handleFile = (f: File) => { setFile(f); setParsed(null); setShowAll(false); };

  const handleParse = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const form  = new FormData();
      form.append("file", file);
      const res  = await fetch("/api/financeiro/parse-ofx", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? "Erro desconhecido");
      if (data.count === 0) {
        toast.error("Nenhuma transação encontrada no arquivo. Verifique se o arquivo é um OFX válido.");
        return;
      }
      setParsed(data.transactions);
      setFormato(data.formato ?? "");
      toast.success(`${data.count} transações lidas (formato ${data.formato ?? "detectado"})`);
    } catch (e: any) {
      toast.error("Erro ao processar OFX: " + e.message);
    } finally { setLoading(false); }
  };

  const handleConfirmar = () => {
    if (!parsed || !contaId) { toast.error("Selecione a conta destino"); return; }
    batchMut.mutate({ contaId: parseInt(contaId), transacoes: parsed });
  };

  const totalCredito = parsed?.filter(t => t.tipo === "CREDITO").reduce((s, t) => s + t.valor, 0) ?? 0;
  const totalDebito  = parsed?.filter(t => t.tipo === "DEBITO").reduce((s, t) => s + t.valor, 0) ?? 0;
  const semFitId     = parsed?.filter(t => !t.fitId).length ?? 0;
  const visivel      = parsed ? (showAll ? parsed : parsed.slice(0, 20)) : [];

  return (
    <FinanceiroLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Importar OFX</h1>
          <Button variant="outline" size="sm" onClick={() => setNovaContaOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Nova conta
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Arquivo OFX</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                  dragActive ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10" : "border-border hover:border-emerald-400"
                )}
                onDragEnter={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}
              >
                <UploadCloud className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-sm font-medium">
                    <FileText className="w-4 h-4 text-emerald-600" />{file.name}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Arraste o .ofx aqui ou clique para selecionar</p>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".ofx,.OFX" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

              <div className="space-y-2">
                <Label>Conta destino</Label>
                <Select value={contaId} onValueChange={setContaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a conta..." /></SelectTrigger>
                  <SelectContent>
                    {contas.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome} — {c.banco}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {!parsed && (
                <Button className="w-full" disabled={!file || loading} onClick={handleParse}>
                  {loading ? "Processando..." : "Processar arquivo"}
                </Button>
              )}

              {parsed && (
                <div className="space-y-3">
                  {/* Resumo */}
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-300 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      {parsed.length} transações encontradas no arquivo
                      {formato && <Badge variant="outline" className="text-xs ml-1">{formato}</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                        <TrendingUp className="w-3 h-3" />
                        Entradas: <span className="font-medium">{fmt(totalCredito)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <TrendingDown className="w-3 h-3" />
                        Saídas: <span className="font-medium">{fmt(totalDebito)}</span>
                      </div>
                    </div>
                    {semFitId > 0 && (
                      <div className="flex items-center gap-1 text-amber-600 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        {semFitId} transação(ões) sem FITID — deduplicação indisponível para elas
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setParsed(null); setFile(null); setShowAll(false); }}>
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={!contaId || batchMut.isPending}
                      onClick={handleConfirmar}
                    >
                      {batchMut.isPending ? "Importando..." : `Importar ${parsed.length}`}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contas cadastradas */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" />Contas cadastradas</CardTitle></CardHeader>
            <CardContent>
              {contas.length === 0
                ? <p className="text-sm text-muted-foreground">Nenhuma conta. Crie uma acima.</p>
                : (
                  <div className="space-y-2">
                    {contas.map(c => (
                      <div key={c.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium">{c.nome}</p>
                          <p className="text-xs text-muted-foreground">{c.banco} · {c.tipo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Preview das transações parseadas */}
        {parsed && parsed.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Preview — transações do arquivo ({parsed.length} total)</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {parsed.filter(t => t.fitId).length} com FITID · {semFitId} sem FITID
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-2 font-medium text-xs text-muted-foreground">DATA</th>
                      <th className="text-left px-4 py-2 font-medium text-xs text-muted-foreground">DESCRIÇÃO</th>
                      <th className="text-right px-4 py-2 font-medium text-xs text-muted-foreground">VALOR</th>
                      <th className="text-center px-4 py-2 font-medium text-xs text-muted-foreground">TIPO</th>
                      <th className="text-left px-4 py-2 font-medium text-xs text-muted-foreground">FITID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visivel.map((t, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmtDt(t.data)}</td>
                        <td className="px-4 py-2 max-w-[280px] truncate" title={t.descricao}>{t.descricao || <span className="text-muted-foreground italic">sem descrição</span>}</td>
                        <td className={cn("px-4 py-2 text-right font-medium tabular-nums whitespace-nowrap", t.tipo === "CREDITO" ? "text-emerald-600" : "text-red-600")}>
                          {t.tipo === "DEBITO" ? "−" : "+"}{fmt(t.valor)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Badge variant={t.tipo === "CREDITO" ? "default" : "destructive"} className="text-xs">
                            {t.tipo === "CREDITO" ? "Entrada" : "Saída"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground font-mono">
                          {t.fitId
                            ? <span className="flex items-center gap-1"><Copy className="w-3 h-3" />{t.fitId.slice(-12)}</span>
                            : <span className="text-amber-500">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.length > 20 && (
                <div className="px-4 py-3 border-t text-center">
                  <Button variant="ghost" size="sm" onClick={() => setShowAll(v => !v)}>
                    {showAll ? "Ver menos" : `Ver todas as ${parsed.length} transações`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Histórico */}
        {historico.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4" />Histórico de importações</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">
                {historico.slice(0, 10).map((h: any) => (
                  <div key={h.id} className="flex items-center justify-between text-sm border-b py-1.5 last:border-0">
                    <span className="text-muted-foreground">{new Date(h.dataImportacao).toLocaleDateString("pt-BR")}</span>
                    <span className="font-medium truncate max-w-[200px]">{h.nomeArquivo}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{h.quantidadeTransacoes} transações</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog nova conta */}
      <Dialog open={novaContaOpen} onOpenChange={setNovaContaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova conta bancária</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome da conta</Label><Input value={novaConta.nome} onChange={e => setNovaConta(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Banco Inter" /></div>
            <div><Label>Banco</Label><Input value={novaConta.banco} onChange={e => setNovaConta(p => ({ ...p, banco: e.target.value }))} placeholder="Ex: Inter" /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={novaConta.tipo} onValueChange={v => setNovaConta(p => ({ ...p, tipo: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Corrente", "Poupança", "Cartão de Crédito", "Caixa"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaContaOpen(false)}>Cancelar</Button>
            <Button disabled={!novaConta.nome || !novaConta.banco || criarContaMut.isPending} onClick={() => criarContaMut.mutate(novaConta)}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
