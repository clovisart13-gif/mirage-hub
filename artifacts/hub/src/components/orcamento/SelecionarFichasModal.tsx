import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listFichas, criarOrcamento, adicionarItem } from "@/lib/custos-api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function SelecionarFichasModal({ isOpen, onClose }: Props) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [nomeCliente, setNomeCliente] = useState("");
  const [marca, setMarca] = useState("");
  const [descricao, setDescricao] = useState("");
  const [selectedFichas, setSelectedFichas] = useState<string[]>([]);
  const [markup, setMarkup] = useState("0.5");
  const [isCreating, setIsCreating] = useState(false);
  const [filtroCliente, setFiltroCliente] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [descontoTipo, setDescontoTipo] = useState<"percentual" | "valor">("percentual");
  const [descontoValor, setDescontoValor] = useState("");

  const { data: fichas = [] } = useQuery<any[]>({ queryKey: ["custos-fichas"], queryFn: listFichas, enabled: isOpen });

  const clientesUnicos = useMemo(() => {
    const c = new Set<string>();
    fichas.forEach((f) => { if (f.cliente) c.add(f.cliente); });
    return Array.from(c).sort();
  }, [fichas]);

  const fichasFiltradas = useMemo(() => {
    if (!filtroCliente || filtroCliente === "__all__") return fichas;
    return fichas.filter((f) => f.cliente === filtroCliente);
  }, [fichas, filtroCliente]);

  const handleFiltroClienteChange = (cliente: string) => {
    setFiltroCliente(cliente);
    if (cliente && cliente !== "__all__") setNomeCliente(cliente);
  };

  const handleSelectFicha = (fichaId: string) => {
    setSelectedFichas((prev) => prev.includes(fichaId) ? prev.filter((id) => id !== fichaId) : [...prev, fichaId]);
  };

  const handleSelectAll = () => {
    if (selectedFichas.length === fichasFiltradas.length && fichasFiltradas.length > 0) {
      setSelectedFichas([]);
    } else {
      setSelectedFichas(fichasFiltradas.map((f) => f.id));
    }
  };

  const handleCreateOrcamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCliente) { toast.error("Preencha nome do cliente!"); return; }
    if (selectedFichas.length === 0) { toast.error("Selecione pelo menos uma ficha de custo!"); return; }
    setIsCreating(true);
    try {
      const orc = await criarOrcamento({
        nomeCliente,
        marca,
        observacoes: observacoes || undefined,
        descontoTipo: descontoValor ? descontoTipo : undefined,
        descontoValor: descontoValor ? parseFloat(descontoValor) : undefined,
      }) as any;

      const fichasCompletas = fichas.filter((f) => selectedFichas.includes(f.id));
      const markupValue = parseFloat(markup || "0");

      for (const ficha of fichasCompletas) {
        const custo = ficha.custoTotal || 0;
        const pv = markupValue > 0 ? custo / markupValue : custo;
        await adicionarItem(orc.id, {
          fichaId: ficha.id,
          referencia: ficha.referencia,
          descricao: ficha.familia,
          quantidade: 1,
          custo,
          valorUnitario: pv,
          markupDivisor: markupValue,
        });
      }

      toast.success(`Orçamento criado com ${fichasCompletas.length} itens!`);
      qc.invalidateQueries({ queryKey: ["custos-orcamentos"] });
      onClose();
      navigate(`/hub/custos/orcamentos/${orc.id}`);
    } catch (error) {
      toast.error("Erro ao criar orçamento!");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Orçamento a partir de Fichas de Custo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCreateOrcamento} className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Dados do Cliente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nomeCliente">Nome do Cliente</Label>
                <Input id="nomeCliente" placeholder="Ex: Acme Corp" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="marca">Marca (Opcional)</Label>
                <Input id="marca" placeholder="Ex: Nike" value={marca} onChange={(e) => setMarca(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Descrição do Orçamento</h3>
            <div>
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Input id="descricao" placeholder="Ex: Coleção Verão 2026" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Configuração de Preço</h3>
            <div>
              <Label htmlFor="markup">Markup Divisor (ex: 0.5 = custo ÷ 0.5)</Label>
              <Input id="markup" type="number" placeholder="0.5" step="0.05" value={markup} onChange={(e) => setMarkup(e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">Preço de Venda = Custo ÷ Markup Divisor</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Observações (Opcional)</h3>
            <textarea
              placeholder="Notas adicionais sobre o orçamento..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[80px]"
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Desconto (Opcional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="descontoTipo">Tipo de Desconto</Label>
                <select
                  id="descontoTipo"
                  value={descontoTipo}
                  onChange={(e) => setDescontoTipo(e.target.value as "percentual" | "valor")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                >
                  <option value="percentual">Percentual (%)</option>
                  <option value="valor">Valor Fixo (R$)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="descontoValor">Valor do Desconto</Label>
                <Input id="descontoValor" type="number" placeholder="0.00" step="0.01" value={descontoValor} onChange={(e) => setDescontoValor(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Selecione as Fichas de Custo</h3>
              <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedFichas.length === fichasFiltradas.length ? "Desselecionar Todas" : "Selecionar Todas"}
              </Button>
            </div>

            {clientesUnicos.length > 0 && (
              <div>
                <Label htmlFor="filtroCliente">Filtrar por Cliente</Label>
                <select
                  id="filtroCliente"
                  value={filtroCliente}
                  onChange={(e) => handleFiltroClienteChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                >
                  <option value="__all__">Todos os clientes</option>
                  {clientesUnicos.map((cliente) => (
                    <option key={cliente} value={cliente}>{cliente}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{fichasFiltradas.length} ficha(s) encontrada(s)</p>
              </div>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
              {fichasFiltradas.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma ficha encontrada</p>
              ) : (
                fichasFiltradas.map((ficha) => {
                  const mkp = parseFloat(markup || "0");
                  const custo = ficha.custoTotal || 0;
                  const pv = mkp > 0 ? custo / mkp : custo;
                  const lucro = pv - custo;
                  return (
                    <div key={ficha.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={`ficha-${ficha.id}`}
                        checked={selectedFichas.includes(ficha.id)}
                        onCheckedChange={() => handleSelectFicha(ficha.id)}
                      />
                      <label htmlFor={`ficha-${ficha.id}`} className="flex-1 cursor-pointer text-sm">
                        <div className="font-semibold">{ficha.referencia}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          Custo: <span className="font-semibold">{fmt(custo)}</span>
                          {" • "}
                          PV: <span className="font-semibold">{fmt(pv)}</span>
                          {" • "}
                          Lucro: <span className="font-semibold text-green-600">{fmt(lucro)}</span>
                        </div>
                      </label>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isCreating || selectedFichas.length === 0}>
              {isCreating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</>) : "Criar Orçamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
