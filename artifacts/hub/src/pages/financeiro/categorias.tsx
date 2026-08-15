import { useState } from "react";
import FinanceiroLayout from "@/components/financeiro/FinanceiroLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Plus, Tag, Layers } from "lucide-react";
import { toast } from "sonner";

interface Categoria { id: string; nome: string; naturezaPadrao: string; centroCustoPadrao: string; grupoGerencial?: string; }

const GRUPOS = ["Custo Direto (CMV)", "Despesa Variável", "Despesa Fixa", "Impostos", "Investimentos", "Receita", "Não Operacional"];

export default function Categorias() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"categorias" | "naturezas" | "centros">("categorias");
  const [modalOpen, setModalOpen] = useState(false);
  const [nova, setNova] = useState({ nome: "", naturezaPadrao: "", centroCustoPadrao: "", grupoGerencial: "" });
  const [novaNat, setNovaNat] = useState("");
  const [noveCC, setNoveCC] = useState("");

  const { data: categorias = [] } = useQuery<Categoria[]>({ queryKey: ["fin-categorias"], queryFn: () => apiFetch("/financeiro/categorias") });
  const { data: naturezas = [] } = useQuery<string[]>({ queryKey: ["fin-naturezas"], queryFn: () => apiFetch("/financeiro/naturezas") });
  const { data: centros = [] } = useQuery<string[]>({ queryKey: ["fin-centros-custo"], queryFn: () => apiFetch("/financeiro/centros-custo") });

  const inv = (keys: string[]) => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));

  const criarCat = useMutation({ mutationFn: (d: any) => apiFetch("/financeiro/categorias", { method: "POST", body: JSON.stringify(d) }), onSuccess: () => { inv(["fin-categorias"]); setModalOpen(false); setNova({ nome: "", naturezaPadrao: "", centroCustoPadrao: "", grupoGerencial: "" }); toast.success("Categoria criada!"); } });
  const delCat   = useMutation({ mutationFn: (id: string) => apiFetch(`/financeiro/categorias/${id}`, { method: "DELETE" }), onSuccess: () => inv(["fin-categorias"]) });
  const criarNat = useMutation({ mutationFn: (nome: string) => apiFetch("/financeiro/naturezas", { method: "POST", body: JSON.stringify({ nome }) }), onSuccess: () => { inv(["fin-naturezas"]); setNovaNat(""); } });
  const delNat   = useMutation({ mutationFn: (nome: string) => apiFetch(`/financeiro/naturezas/${encodeURIComponent(nome)}`, { method: "DELETE" }), onSuccess: () => inv(["fin-naturezas"]) });
  const criarCC  = useMutation({ mutationFn: (nome: string) => apiFetch("/financeiro/centros-custo", { method: "POST", body: JSON.stringify({ nome }) }), onSuccess: () => { inv(["fin-centros-custo"]); setNoveCC(""); } });
  const delCC    = useMutation({ mutationFn: (nome: string) => apiFetch(`/financeiro/centros-custo/${encodeURIComponent(nome)}`, { method: "DELETE" }), onSuccess: () => inv(["fin-centros-custo"]) });

  const TABS = [{ id: "categorias", label: "Categorias" }, { id: "naturezas", label: "Naturezas" }, { id: "centros", label: "Centros de Custo" }] as const;

  return (
    <FinanceiroLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Categorias</h1>
          {tab === "categorias" && (
            <Button size="sm" onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-1" />Nova categoria</Button>
          )}
        </div>

        <div className="flex gap-1 border-b">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? "border-emerald-600 text-emerald-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "categorias" && (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Nome</th>
                  <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Natureza Padrão</th>
                  <th className="text-left px-3 py-2 font-medium hidden lg:table-cell">Centro de Custo</th>
                  <th className="text-left px-3 py-2 font-medium hidden lg:table-cell">Grupo</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {categorias.map(c => (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{c.nome}</td>
                    <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{c.naturezaPadrao}</td>
                    <td className="px-3 py-2 text-muted-foreground hidden lg:table-cell">{c.centroCustoPadrao}</td>
                    <td className="px-3 py-2 hidden lg:table-cell">
                      {c.grupoGerencial && <span className="text-xs bg-muted px-2 py-0.5 rounded">{c.grupoGerencial}</span>}
                    </td>
                    <td className="px-3 py-2">
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive" onClick={() => delCat.mutate(c.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "naturezas" && (
          <div className="space-y-3">
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (novaNat.trim()) criarNat.mutate(novaNat.trim()); }}>
              <Input placeholder="Nova natureza..." value={novaNat} onChange={e => setNovaNat(e.target.value)} />
              <Button type="submit" disabled={!novaNat.trim()}><Plus className="w-4 h-4" /></Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {naturezas.map(n => (
                <span key={n} className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-sm">
                  {n}
                  <button onClick={() => delNat.mutate(n)} className="text-muted-foreground hover:text-destructive ml-1"><Trash2 className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>
        )}

        {tab === "centros" && (
          <div className="space-y-3">
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (noveCC.trim()) criarCC.mutate(noveCC.trim()); }}>
              <Input placeholder="Novo centro de custo..." value={noveCC} onChange={e => setNoveCC(e.target.value)} />
              <Button type="submit" disabled={!noveCC.trim()}><Plus className="w-4 h-4" /></Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {centros.map(c => (
                <span key={c} className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-sm">
                  {c}
                  <button onClick={() => delCC.mutate(c)} className="text-muted-foreground hover:text-destructive ml-1"><Trash2 className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova categoria</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={nova.nome} onChange={e => setNova(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><Label>Natureza padrão</Label>
              <Select value={nova.naturezaPadrao} onValueChange={v => setNova(p => ({ ...p, naturezaPadrao: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{naturezas.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Centro de custo padrão</Label>
              <Select value={nova.centroCustoPadrao} onValueChange={v => setNova(p => ({ ...p, centroCustoPadrao: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{centros.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Grupo gerencial</Label>
              <Select value={nova.grupoGerencial} onValueChange={v => setNova(p => ({ ...p, grupoGerencial: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{GRUPOS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button disabled={!nova.nome || !nova.naturezaPadrao || !nova.centroCustoPadrao || criarCat.isPending} onClick={() => criarCat.mutate(nova)}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
