import { useState } from "react";
import FinanceiroLayout from "@/components/financeiro/FinanceiroLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2, Pencil, CheckCircle2, XCircle, Clock, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface Conta { id: number; nome: string; banco: string; }
interface Conexao {
  id: number; nome: string; banco: string; tipo_auth: string;
  client_id: string | null; conta_id: number | null; ativo: boolean;
  ultimo_import: string | null; created_at: string;
}

const BANCOS = ["Banco Inter", "Nubank", "Bradesco", "Itaú", "Santander", "Sicoob", "BB", "Caixa", "Outro"];

const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const EMPTY = {
  nome: "", banco: "Banco Inter", clientId: "", clientSecret: "",
  certCrt: "", certKey: "", contaId: "", ativo: true,
};

export default function ConexoesBanco() {
  const qc = useQueryClient();
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState<Conexao | null>(null);
  const [form, setForm]       = useState({ ...EMPTY });
  const [importing, setImporting] = useState<number | null>(null);

  const { data: conexoes = [], isLoading } = useQuery<Conexao[]>({
    queryKey: ["fin-conexoes"],
    queryFn: () => apiFetch("/financeiro/conexoes-banco"),
  });
  const { data: contas = [] } = useQuery<Conta[]>({
    queryKey: ["fin-contas"],
    queryFn: () => apiFetch("/financeiro/contas"),
  });

  const openNew = () => { setEditing(null); setForm({ ...EMPTY }); setOpen(true); };
  const openEdit = (c: Conexao) => {
    setEditing(c);
    setForm({ nome: c.nome, banco: c.banco, clientId: c.client_id ?? "", clientSecret: "", certCrt: "", certKey: "", contaId: String(c.conta_id ?? ""), ativo: c.ativo });
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: (data: any) => editing
      ? apiFetch(`/financeiro/conexoes-banco/${editing.id}`, { method: "PUT", body: JSON.stringify(data) })
      : apiFetch("/financeiro/conexoes-banco", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fin-conexoes"] });
      setOpen(false);
      toast.success(editing ? "Conexão atualizada!" : "Conexão criada!");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/financeiro/conexoes-banco/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fin-conexoes"] }); toast.success("Conexão removida"); },
  });

  const handleSave = () => {
    if (!form.nome || !form.banco) { toast.error("Preencha nome e banco"); return; }
    saveMut.mutate({
      nome:         form.nome,
      banco:        form.banco,
      clientId:     form.clientId || undefined,
      clientSecret: form.clientSecret || undefined,
      certCrt:      form.certCrt || undefined,
      certKey:      form.certKey || undefined,
      contaId:      form.contaId ? parseInt(form.contaId) : undefined,
      ativo:        form.ativo,
    });
  };

  const handleImportar = async (id: number) => {
    setImporting(id);
    try {
      const res = await apiFetch(`/financeiro/conexoes-banco/${id}/importar`, { method: "POST" });
      qc.invalidateQueries({ queryKey: ["fin-conexoes"] });
      qc.invalidateQueries({ queryKey: ["fin-transacoes"] });
      if (res.importadas === 0 && res.duplicadas > 0) {
        toast.info(`Nenhuma novidade — ${res.duplicadas} transações já existiam`);
      } else {
        toast.success(`${res.importadas} transações importadas · ${res.duplicadas} já existiam · Período: ${res.periodo.dataInicio} a ${res.periodo.dataFim}`);
      }
    } catch (e: any) {
      toast.error("Erro na importação: " + e.message);
    } finally {
      setImporting(null);
    }
  };

  return (
    <FinanceiroLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Conexões Bancárias</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure a importação automática de extratos via API dos bancos.
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Nova conexão
          </Button>
        </div>

        {/* Info Inter */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Landmark className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-blue-800 dark:text-blue-300">Como conectar o Banco Inter</p>
                <ol className="text-blue-700 dark:text-blue-400 space-y-0.5 list-decimal list-inside text-xs">
                  <li>Acesse <strong>developers.inter.co</strong> → Minhas Integrações → criar nova</li>
                  <li>Selecione escopo <strong>API Banking</strong> → marque leitura de extrato → aceite os termos</li>
                  <li>Baixe os arquivos <strong>.crt</strong> e <strong>.key</strong> gerados</li>
                  <li>Copie o <strong>Client ID</strong> e <strong>Client Secret</strong></li>
                  <li>Clique em "Nova conexão" abaixo e cole as credenciais</li>
                </ol>
                <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                  A importação automática roda todo dia às <strong>06h00 (horário de Brasília)</strong>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de conexões */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : conexoes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              Nenhuma conexão configurada. Clique em "Nova conexão" para começar.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {conexoes.map(c => (
              <Card key={c.id} className={cn(!c.ativo && "opacity-60")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        c.ativo ? "bg-emerald-500" : "bg-muted-foreground"
                      )} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.nome}</span>
                          <Badge variant="outline" className="text-xs">{c.banco}</Badge>
                          {!c.ativo && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                          {c.client_id && <span>Client ID: <code className="font-mono">{c.client_id.slice(0, 12)}…</code></span>}
                          {c.conta_id && <span>Conta vinculada</span>}
                          {c.ultimo_import
                            ? <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Último import: {fmt(c.ultimo_import)}</span>
                            : <span className="text-amber-600">Nunca importado</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={importing === c.id || !c.ativo}
                        onClick={() => handleImportar(c.id)}
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5 mr-1", importing === c.id && "animate-spin")} />
                        {importing === c.id ? "Importando..." : "Importar agora"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { if (confirm("Remover esta conexão?")) deleteMut.mutate(c.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar conexão" : "Nova conexão bancária"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nome da conexão</Label>
                <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Inter Conta Principal" />
              </div>
              <div className="space-y-1">
                <Label>Banco</Label>
                <Select value={form.banco} onValueChange={v => setForm(p => ({ ...p, banco: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BANCOS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Conta destino (onde os lançamentos serão salvos)</Label>
              <Select value={form.contaId} onValueChange={v => setForm(p => ({ ...p, contaId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione uma conta..." /></SelectTrigger>
                <SelectContent>
                  {contas.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome} — {c.banco}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Client ID</Label>
                <Input value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))} placeholder="Cole o Client ID" />
              </div>
              <div className="space-y-1">
                <Label>Client Secret</Label>
                <Input type="password" value={form.clientSecret} onChange={e => setForm(p => ({ ...p, clientSecret: e.target.value }))} placeholder={editing ? "Deixe vazio para não alterar" : "Cole o Client Secret"} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Certificado (.crt) — conteúdo PEM</Label>
              <Textarea
                value={form.certCrt}
                onChange={e => setForm(p => ({ ...p, certCrt: e.target.value }))}
                placeholder={"-----BEGIN CERTIFICATE-----\n..."}
                className="font-mono text-xs h-24"
              />
              <p className="text-xs text-muted-foreground">Cole o conteúdo completo do arquivo .crt baixado do portal Inter</p>
            </div>

            <div className="space-y-1">
              <Label>Chave privada (.key) — conteúdo PEM</Label>
              <Textarea
                value={form.certKey}
                onChange={e => setForm(p => ({ ...p, certKey: e.target.value }))}
                placeholder={"-----BEGIN PRIVATE KEY-----\n..."}
                className="font-mono text-xs h-24"
              />
              <p className="text-xs text-muted-foreground">Cole o conteúdo completo do arquivo .key baixado do portal Inter</p>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={v => setForm(p => ({ ...p, ativo: v }))} />
              <Label>Conexão ativa (importação automática habilitada)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={saveMut.isPending} onClick={handleSave}>
              {saveMut.isPending ? "Salvando..." : editing ? "Atualizar" : "Criar conexão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
