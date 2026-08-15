import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listFichas, adicionarItem } from "@/lib/custos-api";

interface Props {
  orcamentoId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AdicionarItemManual({ orcamentoId, onSuccess, onCancel }: Props) {
  const [codigoReferencia, setCodigoReferencia] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorUnitario, setValorUnitario] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [isAviamento, setIsAviamento] = useState(false);
  const [isDesenvolvimento, setIsDesenvolvimento] = useState(false);
  const [searchReferencia, setSearchReferencia] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: fichas = [] } = useQuery<any[]>({ queryKey: ["custos-fichas"], queryFn: listFichas });

  const referenciasDisponiveis = useMemo(() => {
    if (!fichas || !searchReferencia) return [];
    return fichas
      .filter((f) => `${f.referencia} - ${f.tipo}`.toLowerCase().includes(searchReferencia.toLowerCase()))
      .slice(0, 10);
  }, [fichas, searchReferencia]);

  const handleSelectReferencia = (ficha: any) => {
    setCodigoReferencia(ficha.referencia);
    setDescricao(ficha.tipo);
    setSearchReferencia("");
    setShowSuggestions(false);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoReferencia || !descricao || !valorUnitario || !quantidade) {
      toast.error("Preencha todos os campos!");
      return;
    }
    const valor = parseFloat(valorUnitario);
    const qtd = parseFloat(quantidade);
    if (isNaN(valor) || valor <= 0 || isNaN(qtd) || qtd <= 0) { toast.error("Valores inválidos!"); return; }
    setIsLoading(true);
    try {
      await adicionarItem(orcamentoId, {
        referencia: codigoReferencia,
        descricao,
        quantidade: qtd,
        custo: 0,
        valorUnitario: valor,
        markupDivisor: 1,
        isAviamento,
        isDesenvolvimento,
      });
      toast.success("Item adicionado com sucesso!");
      setCodigoReferencia("");
      setDescricao("");
      setValorUnitario("");
      setQuantidade("1");
      setIsAviamento(false);
      setIsDesenvolvimento(false);
      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao adicionar item: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleAddItem} className="space-y-4 p-4 bg-muted rounded-lg">
      <h3 className="font-semibold">Adicionar Item Manualmente</h3>

      <div>
        <Label htmlFor="searchReferencia">Buscar Referência</Label>
        <div className="relative">
          <Input
            id="searchReferencia"
            value={searchReferencia}
            onChange={(e) => { setSearchReferencia(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Digite para buscar referência..."
          />
          {showSuggestions && referenciasDisponiveis.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md mt-1 z-10 max-h-40 overflow-y-auto">
              {referenciasDisponiveis.map((ficha) => (
                <button
                  key={ficha.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0"
                  onClick={() => handleSelectReferencia(ficha)}
                >
                  <div className="font-semibold text-sm">{ficha.referencia}</div>
                  <div className="text-xs text-gray-600">{ficha.tipo}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="codigoReferencia">Código de Referência *</Label>
        <Input id="codigoReferencia" value={codigoReferencia} onChange={(e) => setCodigoReferencia(e.target.value)} placeholder="Ex: 26VES-002" required />
      </div>

      <div>
        <Label htmlFor="descricao">Descrição *</Label>
        <Input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Camiseta Verão" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="valorUnitario">Valor Unitário *</Label>
          <Input id="valorUnitario" type="number" step="0.01" value={valorUnitario} onChange={(e) => setValorUnitario(e.target.value)} placeholder="0.00" required />
        </div>
        <div>
          <Label htmlFor="quantidade">Quantidade *</Label>
          <Input id="quantidade" type="number" step="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="1" required />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border px-3 py-2.5 bg-amber-50 border-amber-200">
        <div className="space-y-0.5">
          <Label htmlFor="avi-add-toggle" className="text-sm font-medium text-amber-800">Aviamento / Acessório</Label>
          <p className="text-xs text-amber-600">Etiquetas, botões, tags e acessórios que não compõem a produção principal</p>
        </div>
        <div className="flex items-center gap-2">
          {isAviamento && <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-300">Aviamento</Badge>}
          <Switch id="avi-add-toggle" checked={isAviamento} onCheckedChange={setIsAviamento} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border px-3 py-2.5 bg-blue-50 border-blue-200">
        <div className="space-y-0.5">
          <Label htmlFor="dev-add-toggle" className="text-sm font-medium text-blue-800">Desenvolvimento / Pilotagem</Label>
          <p className="text-xs text-blue-600">Peças de desenvolvimento que não entram na produção seriada</p>
        </div>
        <div className="flex items-center gap-2">
          {isDesenvolvimento && <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-300">Desenvolvimento</Badge>}
          <Switch id="dev-add-toggle" checked={isDesenvolvimento} onCheckedChange={setIsDesenvolvimento} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Adicionando...</>) : "Adicionar Item"}
        </Button>
      </div>
    </form>
  );
}
