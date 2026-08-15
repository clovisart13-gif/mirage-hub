import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { criarOrcamento, adicionarItem } from "@/lib/custos-api";

interface Props {
  ficha: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CriarOrcamentoDaFichaForm({ ficha, onSuccess, onCancel }: Props) {
  const [, navigate] = useLocation();
  const [markup, setMarkup] = useState("0.50");
  const [observacoes, setObservacoes] = useState("");
  const [descontoTipo, setDescontoTipo] = useState<"percentual" | "valor">("percentual");
  const [descontoValor, setDescontoValor] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const qc = useQueryClient();

  const custoTotal = (
    Number(ficha.modelagem || 0) +
    Number(ficha.piloto || 0) +
    Number(ficha.corte || 0) +
    Number(ficha.beneficiamento || 0) +
    Number(ficha.costura || 0) +
    Number(ficha.lavanderia || 0) +
    Number(ficha.acabamento || 0) +
    Number(ficha.passadoria || 0) +
    Number(ficha.tecido || 0) +
    Number(ficha.aviamento || 0)
  );

  const markupDivisor = Number(markup);
  const valorUnitario = markupDivisor > 0 ? custoTotal / markupDivisor : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markup) { toast.error("Selecione um markup divisor"); return; }
    try {
      setIsCreating(true);
      const orc = await criarOrcamento({
        nomeCliente: ficha.cliente || "Cliente",
        marca: ficha.familia || "Marca",
        observacoes: observacoes || undefined,
        descontoTipo: descontoValor > 0 ? descontoTipo : undefined,
        descontoValor: descontoValor > 0 ? descontoValor : undefined,
      });
      const orcamentoId = (orc as any)?.id;
      if (!orcamentoId) { toast.error("Erro ao criar orçamento"); setIsCreating(false); return; }
      await adicionarItem(orcamentoId, {
        fichaId: ficha.id,
        referencia: ficha.referencia,
        descricao: ficha.familia,
        quantidade: 1,
        custo: custoTotal,
        markupDivisor: markupDivisor,
        valorUnitario: valorUnitario,
      });
      toast.success("Orçamento criado com sucesso!");
      qc.invalidateQueries({ queryKey: ["custos-orcamentos"] });
      navigate(`/hub/custos/orcamentos/${orcamentoId}`);
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao criar orçamento:", error);
      toast.error("Erro ao criar orçamento");
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Ficha Selecionada</h3>
        <p className="text-sm text-gray-600"><strong>Referência:</strong> {ficha.referencia}</p>
        <p className="text-sm text-gray-600"><strong>Família:</strong> {ficha.familia}</p>
        <p className="text-sm text-gray-600"><strong>Custo Total:</strong> R$ {custoTotal.toFixed(2)}</p>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-semibold">Selecione o Markup Divisor</Label>
        <div className="space-y-2">
          {['0.40', '0.50', '0.60'].map((value) => (
            <div key={value} className="flex items-center">
              <input
                type="radio"
                id={`markup-${value}`}
                name="markup"
                value={value}
                checked={markup === value}
                onChange={(e) => setMarkup(e.target.value)}
                className="w-4 h-4 text-blue-600 cursor-pointer"
              />
              <label htmlFor={`markup-${value}`} className="ml-3 flex-1 cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                <span className="font-medium">÷ {value}</span>
                <span className="text-gray-500 ml-2">= R$ {(custoTotal / Number(value)).toFixed(2)} por peça</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="observacoes">Observações (Opcional)</Label>
        <textarea
          id="observacoes"
          className="w-full min-h-[80px] px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background mt-1"
          placeholder="Notas adicionais sobre o orçamento..."
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="descontoTipo">Tipo de Desconto (Opcional)</Label>
          <select
            id="descontoTipo"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background h-10 mt-1"
            value={descontoTipo}
            onChange={(e) => setDescontoTipo(e.target.value as "percentual" | "valor")}
          >
            <option value="percentual">Percentual (%)</option>
            <option value="valor">Valor Fixo (R$)</option>
          </select>
        </div>
        <div>
          <Label htmlFor="descontoValor">Valor do Desconto</Label>
          <input
            id="descontoValor"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background h-10 mt-1"
            value={descontoValor}
            onChange={(e) => setDescontoValor(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-600"><strong>Markup Selecionado:</strong> ÷ {markup}</p>
        <p className="text-lg font-semibold text-blue-900 mt-2">Valor Unitário: R$ {valorUnitario.toFixed(2)}</p>
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isCreating}>Cancelar</Button>
        <Button type="submit" disabled={isCreating} className="bg-blue-600 hover:bg-blue-700">
          {isCreating ? "Criando..." : "Criar Orçamento"}
        </Button>
      </div>
    </form>
  );
}
