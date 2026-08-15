import { useState } from "react";
import { useLocation, useParams } from "wouter";
import KanbanLayout from "@/components/kanban/KanbanLayout";
import CustosNav from "@/components/orcamento/CustosNav";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Edit2, Lock, Copy } from "lucide-react";
import { getFicha, atualizarFicha, duplicarFicha } from "@/lib/custos-api";

function fmt(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CAMPOS_MO = [
  { key: "modelagem", label: "Modelagem" },
  { key: "piloto", label: "Piloto" },
  { key: "corte", label: "Corte" },
  { key: "beneficiamento", label: "Personalização" },
  { key: "costura", label: "Costura" },
  { key: "lavanderia", label: "Lavanderia" },
  { key: "acabamento", label: "Acabamento" },
  { key: "passadoria", label: "Passadoria" },
] as const;

const CAMPOS_MP = [
  { key: "tecido", label: "Tecido" },
  { key: "aviamento", label: "Aviamento" },
] as const;

export default function CustosFichaDetalhe() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const fichaId = params.id!;
  const qc = useQueryClient();

  const { data: ficha, isLoading } = useQuery({
    queryKey: ["custos-ficha", fichaId],
    queryFn: () => getFicha(fichaId),
  });

  const [editingInfo, setEditingInfo] = useState(false);
  const [editingMO, setEditingMO] = useState(false);
  const [editingMP, setEditingMP] = useState(false);
  const [editingObs, setEditingObs] = useState(false);

  const [refEdit, setRefEdit] = useState("");
  const [tipoEdit, setTipoEdit] = useState("");
  const [familiaEdit, setFamiliaEdit] = useState("");
  const [clienteEdit, setClienteEdit] = useState("");

  const [moEdit, setMoEdit] = useState<Record<string, string>>({});
  const [mpEdit, setMpEdit] = useState<Record<string, string>>({});
  const [obsEdit, setObsEdit] = useState("");

  const [saving, setSaving] = useState(false);
  const [duplicando, setDuplicando] = useState(false);

  if (isLoading || !ficha) {
    return <div className="container py-8 text-muted-foreground">{isLoading ? "Carregando..." : "Ficha não encontrada"}</div>;
  }

  const f = ficha as any;
  const bloqueada = !!f.temOrcamento;

  const handleDuplicar = async () => {
    setDuplicando(true);
    try {
      const copia = await duplicarFicha(fichaId) as any;
      toast.success(`Ficha duplicada com o código "${copia.referencia}"`);
      navigate(`/hub/custos/fichas/${copia.id}`);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao duplicar ficha");
    } finally { setDuplicando(false); }
  };

  const salvar = async (data: Record<string, any>) => {
    setSaving(true);
    try {
      await atualizarFicha(fichaId, data);
      qc.invalidateQueries({ queryKey: ["custos-ficha", fichaId] });
      qc.invalidateQueries({ queryKey: ["custos-fichas"] });
      toast.success("Salvo com sucesso!");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    } finally { setSaving(false); }
  };

  const handleSalvarInfo = async () => {
    await salvar({ referencia: refEdit, tipo: tipoEdit.toUpperCase(), familia: familiaEdit.toUpperCase(), cliente: clienteEdit });
    setEditingInfo(false);
  };

  const handleSalvarMO = async () => {
    const data: Record<string, number> = {};
    CAMPOS_MO.forEach(({ key }) => { data[key] = parseFloat(moEdit[key]?.replace(",", ".") ?? String(f[key])) || 0; });
    await salvar(data);
    setEditingMO(false);
  };

  const handleSalvarMP = async () => {
    const data: Record<string, number> = {};
    CAMPOS_MP.forEach(({ key }) => { data[key] = parseFloat(mpEdit[key]?.replace(",", ".") ?? String(f[key])) || 0; });
    await salvar(data);
    setEditingMP(false);
  };

  const handleSalvarObs = async () => {
    await salvar({ observacoes: obsEdit });
    setEditingObs(false);
  };

  const custoMO = CAMPOS_MO.reduce((s, { key }) => s + Number(f[key]), 0);
  const custoMP = CAMPOS_MP.reduce((s, { key }) => s + Number(f[key]), 0);
  const custoTotal = custoMO + custoMP;

  return (
    <KanbanLayout>
      <CustosNav />
    <div className="px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate("/hub/custos/fichas")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">{f.referencia}</h1>
        <div className="flex-1" />
        <Button
          variant="outline"
          onClick={handleDuplicar}
          disabled={duplicando}
          className="gap-2"
        >
          <Copy className="h-4 w-4" />
          {duplicando ? "Duplicando..." : "Duplicar Ficha"}
        </Button>
      </div>

      {bloqueada && (
        <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-300 rounded-lg">
          <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Ficha vinculada a orçamento — custos protegidos</p>
            <p className="text-amber-700 text-xs mt-0.5">
              Os valores de mão de obra e matéria-prima não podem ser alterados porque esta ficha já está vinculada a orçamentos.
              Para ajustar os custos, use <strong>Duplicar Ficha</strong> e trabalhe na nova versão.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Dados Gerais */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-base">Dados da Referência</CardTitle>
            {!editingInfo && (
              <Button size="sm" variant="outline" onClick={() => {
                setRefEdit(f.referencia); setTipoEdit(f.tipo);
                setFamiliaEdit(f.familia); setClienteEdit(f.cliente);
                setEditingInfo(true);
              }} className="gap-2">
                <Edit2 className="h-4 w-4" /> Editar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editingInfo ? (
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Referência</Label><Input value={refEdit} onChange={(e) => setRefEdit(e.target.value)} /></div>
                  <div><Label>Tipo</Label><Input value={tipoEdit} onChange={(e) => setTipoEdit(e.target.value.toUpperCase())} /></div>
                  <div><Label>Família</Label><Input value={familiaEdit} onChange={(e) => setFamiliaEdit(e.target.value.toUpperCase())} /></div>
                  <div><Label>Cliente</Label><Input value={clienteEdit} onChange={(e) => setClienteEdit(e.target.value)} /></div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSalvarInfo} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingInfo(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <p><strong>Referência:</strong> {f.referencia}</p>
                <p><strong>Tipo:</strong> {f.tipo}</p>
                <p><strong>Família:</strong> {f.familia}</p>
                <p><strong>Cliente:</strong> {f.cliente}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mão de Obra */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-base">Custos de Mão de Obra</CardTitle>
            {!editingMO && !bloqueada && (
              <Button size="sm" variant="outline" onClick={() => {
                const init: Record<string, string> = {};
                CAMPOS_MO.forEach(({ key }) => { init[key] = String(f[key]); });
                setMoEdit(init); setEditingMO(true);
              }} className="gap-2">
                <Edit2 className="h-4 w-4" /> Editar
              </Button>
            )}
            {bloqueada && (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <Lock className="h-3 w-3" /> Protegido
              </span>
            )}
          </CardHeader>
          <CardContent>
            {editingMO ? (
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  {CAMPOS_MO.map(({ key, label }) => (
                    <div key={key}>
                      <Label>{label}</Label>
                      <Input type="number" step="0.01" value={moEdit[key] ?? ""} onChange={(e) => setMoEdit({ ...moEdit, [key]: e.target.value })} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSalvarMO} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingMO(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                {CAMPOS_MO.map(({ key, label }) => (
                  <p key={key}><strong>{label}:</strong> {fmt(Number(f[key]))}</p>
                ))}
                <div className="col-span-2 border-t pt-2 mt-1">
                  <p className="font-bold">Total MO: {fmt(custoMO)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Matéria-Prima */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-base">Custos de Matéria-Prima</CardTitle>
            {!editingMP && !bloqueada && (
              <Button size="sm" variant="outline" onClick={() => {
                const init: Record<string, string> = {};
                CAMPOS_MP.forEach(({ key }) => { init[key] = String(f[key]); });
                setMpEdit(init); setEditingMP(true);
              }} className="gap-2">
                <Edit2 className="h-4 w-4" /> Editar
              </Button>
            )}
            {bloqueada && (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <Lock className="h-3 w-3" /> Protegido
              </span>
            )}
          </CardHeader>
          <CardContent>
            {editingMP ? (
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  {CAMPOS_MP.map(({ key, label }) => (
                    <div key={key}>
                      <Label>{label}</Label>
                      <Input type="number" step="0.01" value={mpEdit[key] ?? ""} onChange={(e) => setMpEdit({ ...mpEdit, [key]: e.target.value })} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSalvarMP} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingMP(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                {CAMPOS_MP.map(({ key, label }) => (
                  <p key={key}><strong>{label}:</strong> {fmt(Number(f[key]))}</p>
                ))}
                <div className="col-span-2 border-t pt-2 mt-1">
                  <p className="font-bold">Total MP: {fmt(custoMP)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo Total */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader><CardTitle className="text-base text-blue-900">Resumo de Custos</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span>Total Mão de Obra:</span><span className="font-semibold">{fmt(custoMO)}</span></div>
            <div className="flex justify-between"><span>Total Matéria-Prima:</span><span className="font-semibold">{fmt(custoMP)}</span></div>
            <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
              <span>CUSTO TOTAL:</span><span>{fmt(custoTotal)}</span>
            </div>
            <div className="border-t pt-2 mt-2 space-y-1 text-muted-foreground">
              <p>Preço Venda (Markup 50%): <strong className="text-foreground">{fmt(custoTotal / 0.5)}</strong></p>
              <p>Preço Venda (Markup 40%): <strong className="text-foreground">{fmt(custoTotal / 0.4)}</strong></p>
              <p>Preço Venda (Markup 35%): <strong className="text-foreground">{fmt(custoTotal / 0.35)}</strong></p>
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-base">Observações</CardTitle>
            {!editingObs && (
              <Button size="sm" variant="outline" onClick={() => { setObsEdit(f.observacoes ?? ""); setEditingObs(true); }} className="gap-2">
                <Edit2 className="h-4 w-4" /> Editar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editingObs ? (
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <Textarea value={obsEdit} onChange={(e) => setObsEdit(e.target.value)} rows={4} placeholder="Observações sobre a ficha..." />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSalvarObs} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingObs(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {f.observacoes || "Nenhuma observação. Clique em Editar para adicionar."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </KanbanLayout>
  );
}
