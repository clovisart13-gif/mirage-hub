import { useState } from "react";
import FinanceiroLayout from "@/components/financeiro/FinanceiroLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Zap } from "lucide-react";
import { toast } from "sonner";

interface Regra { id: number; termo: string; categoriaId: string; natureza: string; centroCusto: string; }
interface Categoria { id: string; nome: string; naturezaPadrao: string; centroCustoPadrao: string; }

export default function Regras() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ termo: "", categoriaId: "", natureza: "", centroCusto: "" });

  const { data: regras = [] }     = useQuery<Regra[]>({ queryKey: ["fin-regras"], queryFn: () => apiFetch("/financeiro/regras") });
  const { data: categorias = [] } = useQuery<Categoria[]>({ queryKey: ["fin-categorias"], queryFn: () => apiFetch("/financeiro/categorias") });
  const { data: naturezas = [] }  = useQuery<string[]>({ queryKey: ["fin-naturezas"], queryFn: () => apiFetch("/financeiro/naturezas") });
  const { data: centros = [] }    = useQuery<string[]>({ queryKey: ["fin-centros-custo"], queryFn: () => apiFetch("/financeiro/centros-custo") });

  const criarMut = useMutation({
    mutationFn: (d: any) => apiFetch("/financeiro/regras", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fin-regras"] }); setForm({ termo: "", categoriaId: "", natureza: "", centroCusto: "" }); toast.success("Regra criada!"); },
    onError: () => toast.error("Termo muito curto ou regra duplicada"),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/financeiro/regras/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fin-regras"] }),
  });

  const aplicarMut = useMutation({
    mutationFn: () => apiFetch("/financeiro/transacoes/aplicar-regras", { method: "POST", body: "{}" }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["fin-transacoes"] });
      toast.success(`${res.aplicadas} transações classificadas`);
    },
  });

  const catNome = (id: string) => categorias.find(c => c.id === id)?.nome ?? id;

  const handleCatChange = (catId: string) => {
    const cat = categorias.find(c => c.id === catId);
    setForm(p => ({ ...p, categoriaId: catId, natureza: cat?.naturezaPadrao ?? "", centroCusto: cat?.centroCustoPadrao ?? "" }));
  };

  return (
    <FinanceiroLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Regras de Classificação</h1>
            <p className="text-sm text-muted-foreground">Transações com o termo serão classificadas automaticamente na importação.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => aplicarMut.mutate()} disabled={aplicarMut.isPending}>
            <Zap className="w-4 h-4 mr-1" /> Reaplicar todas
          </Button>
        </div>

        {/* Form */}
        <div className="border rounded-lg p-4 space-y-3 bg-card">
          <h3 className="text-sm font-semibold">Nova regra</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Termo (min. 3 caracteres)</Label>
              <Input value={form.termo} onChange={e => setForm(p => ({ ...p, termo: e.target.value }))} placeholder="Ex: POSTO" />
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={form.categoriaId} onValueChange={handleCatChange}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Natureza</Label>
              <Select value={form.natureza} onValueChange={v => setForm(p => ({ ...p, natureza: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{naturezas.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Centro de custo</Label>
              <Select value={form.centroCusto} onValueChange={v => setForm(p => ({ ...p, centroCusto: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{centros.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button
            size="sm"
            disabled={form.termo.length < 3 || !form.categoriaId || !form.natureza || !form.centroCusto || criarMut.isPending}
            onClick={() => criarMut.mutate(form)}
          >
            <Plus className="w-4 h-4 mr-1" /> Adicionar regra
          </Button>
        </div>

        {/* Lista */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Termo</th>
                <th className="text-left px-3 py-2 font-medium">Categoria</th>
                <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Natureza</th>
                <th className="text-left px-3 py-2 font-medium hidden lg:table-cell">Centro de Custo</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {regras.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma regra cadastrada.</td></tr>
              )}
              {regras.map(r => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono font-medium uppercase">{r.termo}</td>
                  <td className="px-3 py-2">{catNome(r.categoriaId)}</td>
                  <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{r.natureza}</td>
                  <td className="px-3 py-2 text-muted-foreground hidden lg:table-cell">{r.centroCusto}</td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive" onClick={() => delMut.mutate(r.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </FinanceiroLayout>
  );
}
