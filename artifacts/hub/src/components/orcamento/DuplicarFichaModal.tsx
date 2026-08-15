import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { criarFicha, getCodigoProximo } from "@/lib/custos-api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fichaOriginal: any;
}

export default function DuplicarFichaModal({ isOpen, onClose, fichaOriginal }: Props) {
  const qc = useQueryClient();
  const [formData, setFormData] = useState({
    referencia: "",
    tipo: "",
    familia: "",
    cliente: "",
    modelagem: 0,
    piloto: 0,
    corte: 0,
    beneficiamento: 0,
    costura: 0,
    lavanderia: 0,
    acabamento: 0,
    passadoria: 0,
    tecido: 0,
    aviamento: 0,
    observacoes: "",
  });

  useEffect(() => {
    if (fichaOriginal && isOpen) {
      const base = {
        tipo: fichaOriginal.tipo || "",
        familia: fichaOriginal.familia || "",
        cliente: fichaOriginal.cliente || "",
        modelagem: Number(fichaOriginal.modelagem) || 0,
        piloto: Number(fichaOriginal.piloto) || 0,
        corte: Number(fichaOriginal.corte) || 0,
        beneficiamento: Number(fichaOriginal.beneficiamento) || 0,
        costura: Number(fichaOriginal.costura) || 0,
        lavanderia: Number(fichaOriginal.lavanderia) || 0,
        acabamento: Number(fichaOriginal.acabamento) || 0,
        passadoria: Number(fichaOriginal.passadoria) || 0,
        tecido: Number(fichaOriginal.tecido) || 0,
        aviamento: Number(fichaOriginal.aviamento) || 0,
        observacoes: fichaOriginal.observacoes || "",
      };
      setFormData({ ...base, referencia: "" });
      getCodigoProximo(fichaOriginal.familia).then((res: any) => {
        setFormData(prev => ({ ...prev, referencia: res.codigo ?? res }));
      }).catch(() => {
        setFormData(prev => ({ ...prev, referencia: fichaOriginal.referencia }));
      });
    }
  }, [fichaOriginal, isOpen]);

  const mutation = useMutation({
    mutationFn: criarFicha,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custos-fichas"] });
      toast.success("Ficha duplicada com sucesso!");
      onClose();
    },
    onError: () => toast.error("Erro ao duplicar ficha"),
  });

  const calcTotal = () =>
    formData.modelagem + formData.piloto + formData.corte + formData.beneficiamento +
    formData.costura + formData.lavanderia + formData.acabamento + formData.passadoria +
    formData.tecido + formData.aviamento;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const num = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [field]: parseFloat(e.target.value) || 0 });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Duplicar Ficha de Custo</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="referencia">Referência *</Label>
                <Input id="referencia" value={formData.referencia} onChange={(e) => setFormData({ ...formData, referencia: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo *</Label>
                <Input id="tipo" value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} placeholder="Ex: Malha, Plano" required />
              </div>
              <div>
                <Label htmlFor="familia">Família *</Label>
                <Input id="familia" value={formData.familia} onChange={(e) => setFormData({ ...formData, familia: e.target.value })} placeholder="Ex: Camiseta, Bermuda" required />
              </div>
              <div>
                <Label htmlFor="cliente">Cliente *</Label>
                <Input id="cliente" value={formData.cliente} onChange={(e) => setFormData({ ...formData, cliente: e.target.value })} required />
              </div>
            </div>
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} rows={3} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Custos de Mão-de-Obra</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['modelagem', 'piloto', 'corte', 'beneficiamento', 'costura', 'lavanderia', 'acabamento', 'passadoria'] as const).map((field) => (
                <div key={field}>
                  <Label htmlFor={field}>{field.charAt(0).toUpperCase() + field.slice(1)}</Label>
                  <Input id={field} type="number" step="0.01" value={formData[field]} onChange={num(field)} />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Custos de Matéria-Prima</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['tecido', 'aviamento'] as const).map((field) => (
                <div key={field}>
                  <Label htmlFor={field}>{field.charAt(0).toUpperCase() + field.slice(1)}</Label>
                  <Input id={field} type="number" step="0.01" value={formData[field]} onChange={num(field)} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-lg font-semibold text-blue-900">Custo Total: R$ {calcTotal().toFixed(2)}</p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {mutation.isPending ? "Duplicando..." : "Duplicar Ficha"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
