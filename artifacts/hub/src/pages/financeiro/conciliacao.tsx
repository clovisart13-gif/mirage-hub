import { useState } from "react";
import FinanceiroLayout from "@/components/financeiro/FinanceiroLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, Calculator } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Conta { id: number; nome: string; banco: string; tipo: string; saldoInicial: string; }
interface Transacao { id: number; contaId?: number; valor: string; tipo: "CREDITO" | "DEBITO"; natureza?: string; }

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const parsePTBR = (s: string) => {
  if (!s) return 0;
  const clean = s.replace(/[^\d,.-]/g, "").replace(",", ".");
  return isNaN(parseFloat(clean)) ? 0 : parseFloat(clean);
};

export default function Conciliacao() {
  const qc = useQueryClient();
  const [contaId, setContaId] = useState("");
  const [saldoReal, setSaldoReal] = useState("");
  const [ajustado, setAjustado] = useState(false);

  const { data: contas = [] } = useQuery<Conta[]>({ queryKey: ["fin-contas"], queryFn: () => apiFetch("/financeiro/contas") });
  const { data: transacoes = [] } = useQuery<Transacao[]>({ queryKey: ["fin-transacoes"], queryFn: () => apiFetch("/financeiro/transacoes") });

  const ajusteMut = useMutation({
    mutationFn: (tx: any) => apiFetch("/financeiro/transacoes", { method: "POST", body: JSON.stringify(tx) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fin-transacoes"] });
      qc.invalidateQueries({ queryKey: ["financeiro-dashboard"] });
      toast.success("Saldo ajustado com sucesso!");
      setAjustado(true);
      setTimeout(() => setAjustado(false), 3000);
    },
  });

  const contaSelecionada = contas.find(c => String(c.id) === contaId);
  const saldoSistema = contaSelecionada
    ? parseFloat(contaSelecionada.saldoInicial) +
      transacoes.filter(t => t.contaId === contaSelecionada.id && t.natureza !== "Movimentação Financeira" && t.natureza !== "Transferência")
        .reduce((s, t) => t.tipo === "CREDITO" ? s + parseFloat(t.valor) : s - parseFloat(t.valor), 0)
    : 0;

  const valorReal = parsePTBR(saldoReal);
  const diferenca = valorReal - saldoSistema;
  const conciliado = Math.abs(diferenca) < 0.01;

  const handleAjustar = () => {
    if (!contaId || conciliado) return;
    ajusteMut.mutate({
      contaId: parseInt(contaId),
      data: new Date().toLocaleDateString("pt-BR"),
      descricao: "Ajuste de Conciliação Bancária",
      valor: Math.abs(diferenca),
      tipo: diferenca > 0 ? "CREDITO" : "DEBITO",
      categoriaId: "ajuste_saldo",
      natureza: "Movimentação Financeira",
      centroCusto: "Financeiro",
    });
  };

  return (
    <FinanceiroLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Conciliação Bancária</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Ajuste de saldo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Conta bancária</Label>
                <Select value={contaId} onValueChange={v => { setContaId(v); setSaldoReal(""); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione a conta..." /></SelectTrigger>
                  <SelectContent>{contas.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {contaId && (
                <>
                  <div className="bg-muted/40 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Saldo no sistema</span>
                      <span className="font-bold">{fmt(saldoSistema)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Saldo real (extrato bancário)</Label>
                    <Input
                      value={saldoReal}
                      onChange={e => setSaldoReal(e.target.value)}
                      placeholder="Ex: 1.250,00"
                    />
                  </div>

                  {saldoReal && (
                    <div className={cn("rounded-lg p-4 space-y-3 border", conciliado ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700" : "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700")}>
                      <div className="flex items-center gap-2">
                        {conciliado
                          ? <><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Saldo conciliado!</span></>
                          : <><AlertCircle className="w-4 h-4 text-amber-600" /><span className="text-sm font-medium text-amber-700 dark:text-amber-300">Divergência encontrada</span></>
                        }
                      </div>
                      {!conciliado && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Diferença</span>
                          <span className={cn("font-bold", diferenca > 0 ? "text-emerald-600" : "text-red-500")}>
                            {diferenca > 0 ? "+" : ""}{fmt(diferenca)}
                          </span>
                        </div>
                      )}
                      {!conciliado && (
                        <Button
                          className="w-full"
                          onClick={handleAjustar}
                          disabled={ajusteMut.isPending}
                        >
                          <Calculator className="w-4 h-4 mr-2" />
                          {ajustado ? "Ajustado!" : "Lançar ajuste de conciliação"}
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Visão geral das contas</CardTitle></CardHeader>
            <CardContent>
              {contas.length === 0
                ? <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>
                : (
                  <div className="space-y-3">
                    {contas.map(c => {
                      const saldo = parseFloat(c.saldoInicial) +
                        transacoes.filter(t => t.contaId === c.id)
                          .reduce((s, t) => t.tipo === "CREDITO" ? s + parseFloat(t.valor) : s - parseFloat(t.valor), 0);
                      return (
                        <div key={c.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                          <div>
                            <p className="text-sm font-medium">{c.nome}</p>
                            <p className="text-xs text-muted-foreground">{c.banco} · {c.tipo}</p>
                          </div>
                          <span className={cn("text-sm font-bold", saldo >= 0 ? "text-emerald-600" : "text-red-500")}>{fmt(saldo)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </FinanceiroLayout>
  );
}
