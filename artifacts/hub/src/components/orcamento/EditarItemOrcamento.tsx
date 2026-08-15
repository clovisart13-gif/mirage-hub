import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { editarItem } from "@/lib/custos-api";
import { Badge } from "@/components/ui/badge";

interface Props {
  item: {
    id: string;
    referencia: string;
    descricao: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    markupDivisor?: number;
    custo?: number;
    isAviamento?: boolean;
    isDesenvolvimento?: boolean;
  };
  orcamentoId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditarItemOrcamento({ item, orcamentoId, onSuccess, onCancel }: Props) {
  const qc = useQueryClient();
  const [referencia, setReferencia] = useState(item.referencia);
  const [quantidade, setQuantidade] = useState(item.quantidade.toString());
  const [valorUnitarioState, setValorUnitarioState] = useState(Number(item.valorUnitario).toFixed(2));
  const [markup, setMarkup] = useState((item.markupDivisor || 0.5).toString());
  const [custo] = useState((item.custo || 0).toString());
  const [descricao, setDescricao] = useState(item.descricao);
  const [isAviamento, setIsAviamento] = useState(item.isAviamento ?? false);
  const [isDesenvolvimento, setIsDesenvolvimento] = useState(item.isDesenvolvimento ?? false);
  const [isLoading, setIsLoading] = useState(false);

  const handleMarkupChange = (novoMarkup: string) => {
    setMarkup(novoMarkup);
    if (parseFloat(novoMarkup) > 0 && parseFloat(custo) > 0) {
      const novoPV = (parseFloat(custo) / parseFloat(novoMarkup)).toFixed(2);
      setValorUnitarioState(novoPV);
    }
  };

  const handlePVChange = (novoPV: string) => {
    setValorUnitarioState(novoPV);
    if (parseFloat(novoPV) > 0 && parseFloat(custo) > 0) {
      const novoMarkup = (parseFloat(custo) / parseFloat(novoPV)).toFixed(4);
      setMarkup(novoMarkup);
    }
  };

  const valorTotal = (parseFloat(quantidade) * parseFloat(valorUnitarioState)).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantidade || !valorUnitarioState) { toast.error("Preencha todos os campos"); return; }
    setIsLoading(true);
    try {
      await editarItem(item.id, {
        referencia,
        descricao,
        quantidade: parseFloat(quantidade),
        valorUnitario: parseFloat(valorUnitarioState),
        markupDivisor: parseFloat(markup),
        isAviamento,
        isDesenvolvimento,
      });
      toast.success("Item atualizado com sucesso!");
      qc.invalidateQueries({ queryKey: ["orcamento", orcamentoId] });
      qc.invalidateQueries({ queryKey: ["custos-orcamentos"] });
      onSuccess();
    } catch (error: any) {
      toast.error(error?.message || "Erro ao atualizar item");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto pr-2">
      <div className="space-y-3 pb-3 border-b">
        <div>
          <label className="text-sm font-medium">Código de Referência *</label>
          <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Ex: 26VES-002" required />
        </div>
        <div>
          <label className="text-sm font-medium">Descrição</label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Camiseta Verão 2024" />
        </div>
      </div>

      <div className="space-y-3 pb-3 border-b">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-medium">Quantidade</label>
            <Input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="Ex: 100" />
          </div>
          <div>
            <label className="text-sm font-medium">Valor Unitário (R$)</label>
            <Input type="number" step="0.01" value={valorUnitarioState} onChange={(e) => handlePVChange(e.target.value)} placeholder="Ex: 40.00" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-medium">Markup Divisor</label>
            <Input type="number" step="0.01" value={markup} onChange={(e) => handleMarkupChange(e.target.value)} placeholder="Ex: 0.50" />
          </div>
          <div>
            <label className="text-sm font-medium">Custo (R$)</label>
            <Input type="number" step="0.01" value={custo} disabled className="bg-gray-100" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Total: R$ {valorTotal}</label>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border px-3 py-2.5 bg-amber-50 border-amber-200">
        <div className="space-y-0.5">
          <Label htmlFor="avi-toggle" className="text-sm font-medium text-amber-800">Aviamento / Acessório</Label>
          <p className="text-xs text-amber-600">Etiquetas, botões, tags e acessórios que não compõem a produção principal</p>
        </div>
        <div className="flex items-center gap-2">
          {isAviamento && <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-300">Aviamento</Badge>}
          <Switch id="avi-toggle" checked={isAviamento} onCheckedChange={setIsAviamento} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border px-3 py-2.5 bg-blue-50 border-blue-200">
        <div className="space-y-0.5">
          <Label htmlFor="dev-toggle" className="text-sm font-medium text-blue-800">Desenvolvimento / Pilotagem</Label>
          <p className="text-xs text-blue-600">Peças de desenvolvimento que não entram na produção seriada</p>
        </div>
        <div className="flex items-center gap-2">
          {isDesenvolvimento && <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-300">Desenvolvimento</Badge>}
          <Switch id="dev-toggle" checked={isDesenvolvimento} onCheckedChange={setIsDesenvolvimento} />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isLoading}>{isLoading ? "Salvando..." : "Salvar"}</Button>
      </div>
    </form>
  );
}
