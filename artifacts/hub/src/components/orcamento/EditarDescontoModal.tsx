import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { atualizarDesconto } from "@/lib/custos-api";

interface Props {
  open: boolean;
  onClose: () => void;
  orcamentoId: string;
  descontoTipoAtual?: string;
  descontoValorAtual?: number;
}

export function EditarDescontoModal({ open, onClose, orcamentoId, descontoTipoAtual, descontoValorAtual }: Props) {
  const qc = useQueryClient();
  const [descontoTipo, setDescontoTipo] = useState<string>(descontoTipoAtual || "percentual");
  const [descontoValor, setDescontoValor] = useState<string>(descontoValorAtual?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDescontoTipo(descontoTipoAtual || "percentual");
      setDescontoValor(descontoValorAtual?.toString() || "");
    }
  }, [open, descontoTipoAtual, descontoValorAtual]);

  const handleSalvar = async () => {
    const valorNumerico = parseFloat(descontoValor) || 0;
    setIsSaving(true);
    try {
      await atualizarDesconto(orcamentoId, {
        descontoTipo: descontoTipo as "percentual" | "valor",
        descontoValor: valorNumerico,
      });
      qc.invalidateQueries({ queryKey: ["orcamento", orcamentoId] });
      qc.invalidateQueries({ queryKey: ["custos-orcamentos"] });
      onClose();
    } catch (error) {
      toast.error("Erro ao salvar desconto");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader><DialogTitle>Editar Desconto</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tipo-desconto">Tipo de Desconto</Label>
            <Select value={descontoTipo} onValueChange={setDescontoTipo}>
              <SelectTrigger id="tipo-desconto">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentual">Percentual (%)</SelectItem>
                <SelectItem value="valor">Valor Fixo (R$)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor-desconto">Valor do Desconto {descontoTipo === "percentual" ? "(%)" : "(R$)"}</Label>
            <Input
              id="valor-desconto"
              type="number"
              step="0.01"
              min="0"
              value={descontoValor}
              onChange={(e) => setDescontoValor(e.target.value)}
              placeholder={descontoTipo === "percentual" ? "Ex: 10" : "Ex: 50.00"}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
