import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import KanbanLayout from "@/components/kanban/KanbanLayout";
import { apiFetch } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Package, Layers } from "lucide-react";

interface ItemPedido {
  id: string;
  pedidoId: string;
  numeroPedido: string;
  nomeCliente: string;
  statusPedido: string;
  referencia: string;
  descricao: string;
  corNome: string;
  quantidadeTotal: number;
  isAviamento: boolean;
  isDesenvolvimento: boolean;
}

type Filtro = "todos" | "aviamento" | "desenvolvimento" | "producao";

export default function KanbanGerirAviamentos() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [pendentesAv, setPendentesAv] = useState<Record<string, boolean>>({});
  const [pendentesDev, setPendentesDev] = useState<Record<string, boolean>>({});

  const { data: itens = [], isLoading } = useQuery<ItemPedido[]>({
    queryKey: ["itens-pedido-todos"],
    queryFn: () => apiFetch("/kanban/itens-pedido/todos"),
  });

  const mutationAv = useMutation({
    mutationFn: ({ id, isAviamento }: { id: string; isAviamento: boolean }) =>
      apiFetch(`/kanban/itens-pedido/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isAviamento }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itens-pedido-todos"] });
    },
  });

  const mutationDev = useMutation({
    mutationFn: ({ id, isDesenvolvimento }: { id: string; isDesenvolvimento: boolean }) =>
      apiFetch(`/kanban/itens-pedido/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isDesenvolvimento }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itens-pedido-todos"] });
    },
  });

  function toggleAviamento(item: ItemPedido) {
    const novoValor = !(pendentesAv[item.id] ?? item.isAviamento);
    setPendentesAv(prev => ({ ...prev, [item.id]: novoValor }));
    mutationAv.mutate(
      { id: item.id, isAviamento: novoValor },
      {
        onSuccess: () => setPendentesAv(prev => { const n = { ...prev }; delete n[item.id]; return n; }),
        onError:   () => setPendentesAv(prev => { const n = { ...prev }; delete n[item.id]; return n; }),
      }
    );
  }

  function toggleDesenvolvimento(item: ItemPedido) {
    const novoValor = !(pendentesDev[item.id] ?? item.isDesenvolvimento);
    setPendentesDev(prev => ({ ...prev, [item.id]: novoValor }));
    mutationDev.mutate(
      { id: item.id, isDesenvolvimento: novoValor },
      {
        onSuccess: () => setPendentesDev(prev => { const n = { ...prev }; delete n[item.id]; return n; }),
        onError:   () => setPendentesDev(prev => { const n = { ...prev }; delete n[item.id]; return n; }),
      }
    );
  }

  const itensFiltrados = useMemo(() => {
    const q = busca.toLowerCase();
    return itens.filter(item => {
      const efAv  = pendentesAv[item.id]  ?? item.isAviamento;
      const efDev = pendentesDev[item.id] ?? item.isDesenvolvimento;
      if (filtro === "aviamento"     && !efAv)  return false;
      if (filtro === "desenvolvimento" && !efDev) return false;
      if (filtro === "producao"      && (efAv || efDev)) return false;
      if (!q) return true;
      return (
        item.referencia.toLowerCase().includes(q) ||
        item.descricao.toLowerCase().includes(q) ||
        item.numeroPedido.toLowerCase().includes(q) ||
        item.nomeCliente.toLowerCase().includes(q) ||
        item.corNome.toLowerCase().includes(q)
      );
    });
  }, [itens, busca, filtro, pendentesAv, pendentesDev]);

  const totalAviamentos    = itens.filter(i => pendentesAv[i.id]  ?? i.isAviamento).length;
  const totalDesenvolvimento = itens.filter(i => pendentesDev[i.id] ?? i.isDesenvolvimento).length;
  const totalProducao      = itens.length - totalAviamentos - totalDesenvolvimento;

  return (
    <KanbanLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-500" />
            Gerir Aviamentos &amp; Desenvolvimento
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Marque itens como aviamento/acessório ou desenvolvimento/pilotagem. Esses itens não geram cartão de produção nem contam nas métricas principais.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Total de Itens</p>
              <p className="text-2xl font-bold">{itens.length}</p>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
            <Layers className="w-8 h-8 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Aviamentos</p>
              <p className="text-2xl font-bold text-amber-600">{totalAviamentos}</p>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
            <span className="text-2xl shrink-0">🔬</span>
            <div>
              <p className="text-xs text-muted-foreground">Desenvolvimento</p>
              <p className="text-2xl font-bold text-blue-600">{totalDesenvolvimento}</p>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
            <Package className="w-8 h-8 text-green-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Produção Principal</p>
              <p className="text-2xl font-bold text-green-600">{totalProducao}</p>
            </div>
          </div>
        </div>

        {/* Filtros e busca */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por referência, descrição, pedido ou cliente..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["todos", "aviamento", "desenvolvimento", "producao"] as Filtro[]).map(f => (
              <Button
                key={f}
                variant={filtro === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltro(f)}
                className={
                  filtro === f && f === "aviamento"
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : filtro === f && f === "desenvolvimento"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : filtro === f && f === "producao"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : ""
                }
              >
                {f === "todos" ? "Todos"
                  : f === "aviamento" ? "Aviamentos"
                  : f === "desenvolvimento" ? "Desenvolvimento"
                  : "Produção"}
              </Button>
            ))}
          </div>
        </div>

        {/* Tabela */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando itens...</div>
        ) : itensFiltrados.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhum item encontrado.</div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Pedido</th>
                  <th className="text-left px-4 py-3 font-medium">Referência</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Descrição</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Cor</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Qtd</th>
                  <th className="text-center px-4 py-3 font-medium">Tipo</th>
                  <th className="text-center px-4 py-3 font-medium">Aviamento</th>
                  <th className="text-center px-4 py-3 font-medium">Desenvolvimento</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {itensFiltrados.map(item => {
                  const efAv  = pendentesAv[item.id]  ?? item.isAviamento;
                  const efDev = pendentesDev[item.id] ?? item.isDesenvolvimento;
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${efDev ? "bg-blue-50/60 dark:bg-blue-950/20" : efAv ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs">{item.numeroPedido}</div>
                        <div className="text-muted-foreground text-xs truncate max-w-[120px]">{item.nomeCliente}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{item.referencia || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                        {item.descricao || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{item.corNome || "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">{item.quantidadeTotal}</td>
                      <td className="px-4 py-3 text-center">
                        {efDev ? (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-[10px]">🔬 Desenvolvimento</Badge>
                        ) : efAv ? (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">Aviamento</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Produção</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={efAv}
                          onCheckedChange={() => toggleAviamento(item)}
                          className="data-[state=checked]:bg-amber-500"
                          disabled={mutationAv.isPending}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={efDev}
                          onCheckedChange={() => toggleDesenvolvimento(item)}
                          className="data-[state=checked]:bg-blue-600"
                          disabled={mutationDev.isPending}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-2 bg-muted/30 text-xs text-muted-foreground border-t">
              {itensFiltrados.length} item(s) exibido(s) de {itens.length} total
            </div>
          </div>
        )}
      </div>
    </KanbanLayout>
  );
}
