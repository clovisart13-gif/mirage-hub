import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { atualizarDesconto } from "@/lib/custos-api";
import { apiFetch } from "@/lib/api";
import { Trash2, Plus, ChevronRight } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  orcamentoId: string;
  observacoesAtuais?: string;
}

export function EditarObservacoesModal({ open, onClose, orcamentoId, observacoesAtuais }: Props) {
  const qc = useQueryClient();
  const [observacoes, setObservacoes] = useState<string>(observacoesAtuais || "");
  const [isSaving, setIsSaving] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [salvandoTemplate, setSalvandoTemplate] = useState(false);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);

  useEffect(() => {
    if (open) setObservacoes(observacoesAtuais || "");
  }, [open, observacoesAtuais]);

  const { data: templates = [], refetch: refetchTemplates } = useQuery<any[]>({
    queryKey: ["observacoes-templates"],
    queryFn: () => apiFetch("/custos/observacoes-templates"),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const handleSalvar = async () => {
    setIsSaving(true);
    try {
      await atualizarDesconto(orcamentoId, { observacoes });
      qc.invalidateQueries({ queryKey: ["orcamento", orcamentoId] });
      qc.invalidateQueries({ queryKey: ["custos-orcamentos"] });
      onClose();
    } catch (error) {
      toast.error("Erro ao salvar observações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAplicarTemplate = (texto: string) => {
    setObservacoes((prev) => prev ? `${prev}\n${texto}` : texto);
  };

  const handleSalvarTemplate = async () => {
    if (!novoTitulo.trim() || !observacoes.trim()) {
      toast.error("Preencha o título e o texto das observações para salvar como template");
      return;
    }
    setSalvandoTemplate(true);
    try {
      await apiFetch("/custos/observacoes-templates", {
        method: "POST",
        body: JSON.stringify({ titulo: novoTitulo.trim(), texto: observacoes.trim() }),
      });
      setNovoTitulo("");
      refetchTemplates();
      qc.invalidateQueries({ queryKey: ["observacoes-templates"] });
      toast.success("Template salvo!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar template");
    } finally {
      setSalvandoTemplate(false);
    }
  };

  const handleDeletarTemplate = async (id: string) => {
    setDeletandoId(id);
    try {
      await apiFetch(`/custos/observacoes-templates/${id}`, { method: "DELETE" });
      refetchTemplates();
      qc.invalidateQueries({ queryKey: ["observacoes-templates"] });
      toast.success("Template removido");
    } catch {
      toast.error("Erro ao remover template");
    } finally {
      setDeletandoId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader><DialogTitle>Editar Observações</DialogTitle></DialogHeader>
        <div className="flex gap-4 py-2">
          {/* Esquerda: textarea + salvar template */}
          <div className="flex-1 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações do orçamento</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Notas adicionais sobre o orçamento..."
                rows={8}
                className="resize-none"
              />
            </div>

            {/* Salvar como template */}
            <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Salvar texto atual como template</p>
              <div className="flex gap-2">
                <Input
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  placeholder="Nome do template (ex: Prazo padrão 30 dias)"
                  className="text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSalvarTemplate}
                  disabled={salvandoTemplate || !novoTitulo.trim()}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {salvandoTemplate ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </div>

          {/* Direita: lista de templates */}
          <div className="w-64 shrink-0 space-y-2">
            <Label className="text-sm">Templates salvos</Label>
            <div className="border rounded-lg overflow-hidden">
              {templates.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Nenhum template salvo ainda.
                  <br />
                  Escreva um texto e salve como template.
                </div>
              ) : (
                <div className="max-h-[280px] overflow-y-auto divide-y">
                  {templates.map((t: any) => (
                    <div key={t.id} className="flex items-start gap-1 p-2 hover:bg-muted/40 group">
                      <button
                        className="flex-1 text-left text-xs leading-snug"
                        onClick={() => handleAplicarTemplate(t.texto)}
                        title={t.texto}
                      >
                        <span className="font-medium flex items-center gap-1">
                          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          {t.titulo}
                        </span>
                        <span className="text-muted-foreground line-clamp-2 pl-4">{t.texto}</span>
                      </button>
                      <button
                        onClick={() => handleDeletarTemplate(t.id)}
                        disabled={deletandoId === t.id}
                        className="shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 p-0.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Clique em um template para inserir no texto</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
