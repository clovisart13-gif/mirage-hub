import { useState } from "react";
import IntegracoesLayout from "@/components/integracoes/IntegracoesLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Zap, FileText, Plug, CheckCircle2, AlertCircle,
  Settings, Trash2, TestTube, ExternalLink, Clock, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Campo { key: string; label: string; tipo: string; placeholder: string }
interface Integracao {
  chave: string;
  nome: string;
  categoria: string;
  descricao: string;
  icon: string;
  cor: string;
  campos: Campo[];
  ambientes: string[];
  docs: string;
  custo: string;
  status: "disponivel" | "em_breve";
  configurada: boolean;
  ativa: boolean;
  ambiente: string;
  config: Record<string, string>;
  testedAt: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ICONS: Record<string, any> = {
  zap: Zap,
  "file-text": FileText,
  plug: Plug,
};

const COR_MAP: Record<string, { badge: string; icon: string; border: string }> = {
  blue:   { badge: "bg-blue-100 text-blue-700 border-blue-200",   icon: "text-blue-600",   border: "border-blue-200" },
  green:  { badge: "bg-green-100 text-green-700 border-green-200", icon: "text-green-600",  border: "border-green-200" },
  purple: { badge: "bg-purple-100 text-purple-700 border-purple-200", icon: "text-purple-600", border: "border-purple-200" },
};

const AMBIENTE_LABEL: Record<string, string> = {
  sandbox: "Sandbox (testes)",
  producao: "Produção",
  homologacao: "Homologação (testes)",
};

// ─── Card de integração ───────────────────────────────────────────────────────

function IntegracaoCard({
  integ,
  onConfigurar,
  onRemover,
  onTestar,
  testando,
}: {
  integ: Integracao;
  onConfigurar: (i: Integracao) => void;
  onRemover: (chave: string) => void;
  onTestar: (chave: string) => void;
  testando: boolean;
}) {
  const IconComp = ICONS[integ.icon] ?? Plug;
  const cor = COR_MAP[integ.cor] ?? COR_MAP.blue;
  const emBreve = integ.status === "em_breve";

  return (
    <Card className={cn(
      "relative flex flex-col transition-shadow hover:shadow-md",
      emBreve && "opacity-60",
    )}>
      {emBreve && (
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500 border-slate-200">
            Em breve
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg bg-muted shrink-0", cor.icon)}>
            <IconComp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base">{integ.nome}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{integ.categoria}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{integ.descricao}</p>

        {/* Custo */}
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{integ.custo}</span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          {integ.configurada ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span className="text-sm font-medium text-green-700">Conectada</span>
              <Badge variant="outline" className={cn("text-[10px] ml-auto", cor.badge)}>
                {AMBIENTE_LABEL[integ.ambiente] ?? integ.ambiente}
              </Badge>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm text-muted-foreground">Não configurada</span>
            </>
          )}
        </div>

        {/* Última verificação */}
        {integ.testedAt && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            Testada em {new Date(integ.testedAt).toLocaleString("pt-BR")}
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2 mt-auto pt-2 border-t">
          {!emBreve && (
            <Button
              size="sm"
              variant={integ.configurada ? "outline" : "default"}
              className="flex-1 gap-1.5"
              onClick={() => onConfigurar(integ)}
            >
              <Settings className="w-3.5 h-3.5" />
              {integ.configurada ? "Editar" : "Configurar"}
            </Button>
          )}

          {integ.configurada && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => onTestar(integ.chave)}
                disabled={testando}
              >
                <TestTube className="w-3.5 h-3.5" />
                Testar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive px-2"
                onClick={() => onRemover(integ.chave)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          <a
            href={integ.docs}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Ver documentação"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Modal de configuração ────────────────────────────────────────────────────

function ModalConfigurar({
  integ,
  onClose,
  onSalvar,
  salvando,
}: {
  integ: Integracao | null;
  onClose: () => void;
  onSalvar: (chave: string, dados: Record<string, string>) => void;
  salvando: boolean;
}) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    if (!integ) return {};
    const base: Record<string, string> = { ambiente: integ.ambiente };
    integ.campos.forEach((c) => {
      base[c.key] = integ.config?.[c.key] ?? "";
    });
    return base;
  });

  if (!integ) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar {integ.nome}</DialogTitle>
          <DialogDescription>
            Insira suas credenciais. Elas ficam armazenadas de forma segura e são usadas apenas para chamadas em nome do seu tenant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Ambiente */}
          <div className="space-y-1.5">
            <Label>Ambiente</Label>
            <Select
              value={form.ambiente ?? integ.ambientes[0]}
              onValueChange={(v) => setForm((f) => ({ ...f, ambiente: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {integ.ambientes.map((a) => (
                  <SelectItem key={a} value={a}>
                    {AMBIENTE_LABEL[a] ?? a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.ambiente !== "producao" && form.ambiente !== undefined && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Modo de testes — nenhuma NF real será emitida
              </p>
            )}
          </div>

          {/* Campos dinâmicos */}
          {integ.campos.map((campo) => (
            <div key={campo.key} className="space-y-1.5">
              <Label>{campo.label}</Label>
              <Input
                type={campo.tipo === "password" ? "password" : "text"}
                placeholder={campo.placeholder}
                value={form[campo.key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [campo.key]: e.target.value }))}
                autoComplete="off"
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => onSalvar(integ.chave, form)}
            disabled={salvando}
          >
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function IntegracoesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<Integracao | null>(null);
  const [testando, setTestando] = useState<string | null>(null);
  const [testeResult, setTesteResult] = useState<{ chave: string; ok: boolean; mensagem: string } | null>(null);

  const { data, isLoading } = useQuery<{ integracoes: Integracao[] }>({
    queryKey: ["integracoes"],
    queryFn: () => apiFetch("/integracoes"),
  });

  const salvarMut = useMutation({
    mutationFn: async ({ chave, dados }: { chave: string; dados: Record<string, string> }) => {
      const { ambiente, api_key, ...rest } = dados;
      return apiFetch(`/integracoes/${chave}`, {
        method: "PUT",
        body: JSON.stringify({ api_key: api_key ?? dados.api_key, ambiente, config: rest }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integracoes"] });
      setModal(null);
    },
  });

  const removerMut = useMutation({
    mutationFn: (chave: string) =>
      apiFetch(`/integracoes/${chave}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integracoes"] }),
  });

  const testar = async (chave: string) => {
    setTestando(chave);
    setTesteResult(null);
    try {
      const r = await apiFetch(`/integracoes/${chave}/testar`, { method: "POST" });
      setTesteResult({ chave, ok: r.ok, mensagem: r.mensagem });
      qc.invalidateQueries({ queryKey: ["integracoes"] });
    } catch {
      setTesteResult({ chave, ok: false, mensagem: "Erro ao testar conexão" });
    } finally {
      setTestando(null);
    }
  };

  const integracoes = data?.integracoes ?? [];
  const conectadas = integracoes.filter((i) => i.configurada).length;

  return (
    <IntegracoesLayout>
      <div className="p-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Integrações</h1>
          <p className="text-muted-foreground mt-1">
            Conecte o Mirage Hub às ferramentas que você já usa — emissão de NF, cobrança e mais.
          </p>
        </div>

        {/* Resumo */}
        {!isLoading && integracoes.length > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={cn("w-5 h-5", conectadas > 0 ? "text-green-600" : "text-slate-300")} />
              <span className="text-sm font-medium">
                {conectadas === 0
                  ? "Nenhuma integração configurada ainda"
                  : `${conectadas} integração${conectadas > 1 ? "s" : ""} conectada${conectadas > 1 ? "s" : ""}`}
              </span>
            </div>
            {conectadas === 0 && (
              <p className="text-xs text-muted-foreground ml-auto">
                Configure uma integração abaixo para começar a emitir NF direto pelo Mirage.
              </p>
            )}
          </div>
        )}

        {/* Alerta resultado de teste */}
        {testeResult && (
          <div className={cn(
            "flex items-center gap-3 p-3.5 rounded-xl border text-sm",
            testeResult.ok
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800",
          )}>
            {testeResult.ok
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{testeResult.mensagem}</span>
            <button
              className="ml-auto text-xs underline opacity-70 hover:opacity-100"
              onClick={() => setTesteResult(null)}
            >
              Fechar
            </button>
          </div>
        )}

        {/* Grid de cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-72 animate-pulse bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integracoes.map((integ) => (
              <IntegracaoCard
                key={integ.chave}
                integ={integ}
                onConfigurar={setModal}
                onRemover={(chave) => removerMut.mutate(chave)}
                onTestar={testar}
                testando={testando === integ.chave}
              />
            ))}
          </div>
        )}

        {/* Info */}
        <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Como funciona</p>
          <p>Cada assinante configura suas próprias credenciais — a Mirage apenas intermedia a chamada de API em seu nome. Suas chaves nunca são compartilhadas com outros tenants.</p>
          <p className="mt-1">Precisa de ajuda para configurar? <a href="/hub/ajuda" className="text-primary underline-offset-4 hover:underline">Acesse o suporte</a>.</p>
        </div>
      </div>

      {/* Modal de configuração */}
      <ModalConfigurar
        integ={modal}
        onClose={() => setModal(null)}
        onSalvar={(chave, dados) => salvarMut.mutate({ chave, dados })}
        salvando={salvarMut.isPending}
      />
    </IntegracoesLayout>
  );
}
