import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  Beaker,
  CheckCircle2,
  CircleDashed,
  DatabaseZap,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ChecklistStatus = "ok" | "pending" | "not_attempted" | "ready" | "blocked" | string;

type ChecklistItem = {
  id: string;
  label: string;
  status: ChecklistStatus;
  updated_at?: string | null;
};

type TrialLab = {
  identity: {
    configured: boolean;
    email: string | null;
    whatsapp_configured: boolean;
    company_name: string | null;
    signup_url: string;
  };
  account: {
    exists: boolean;
    public_email?: string | null;
    created_at?: string | null;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    assinatura_status: string;
    assinatura_expira_em: string | null;
  } | null;
  demo_seed_ready: boolean;
  checklist: ChecklistItem[];
  checkout: {
    sandbox_configured: boolean;
    sandbox_webhook_configured: boolean;
    simulated_checkout_allowed: boolean;
  };
};

function formatDate(date: string | null | undefined, includeTime = false) {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("pt-BR", includeTime ? undefined : { dateStyle: "short" });
}

function statusMeta(status: ChecklistStatus) {
  switch (status) {
    case "ok":
      return { label: "Concluído", className: "bg-emerald-100 text-emerald-800", Icon: CheckCircle2 };
    case "ready":
      return { label: "Pronto", className: "bg-sky-100 text-sky-800", Icon: CheckCircle2 };
    case "blocked":
      return { label: "Bloqueado", className: "bg-red-100 text-red-800", Icon: XCircle };
    case "pending":
      return { label: "Pendente", className: "bg-amber-100 text-amber-800", Icon: CircleDashed };
    default:
      return { label: "Não iniciado", className: "bg-muted text-muted-foreground", Icon: CircleDashed };
  }
}

export default function AdminTrialLab() {
  const [lab, setLab] = useState<TrialLab | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"prepare" | "reset" | "upgrade" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setLab(await apiFetch("/admin/trial-lab"));
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar o laboratório.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const prepareJourney = async () => {
    if (!window.confirm("Preparar uma nova jornada apaga permanentemente a conta reservada, o tenant e os dados demonstrativos atuais. Continue apenas se você vai concluir um novo cadastro pela Landing Page pública.")) return;
    setBusy("prepare");
    setError("");
    try {
      const result = await apiFetch("/admin/trial-lab/prepare", { method: "POST" });
      setNotice(result.message || "Ambiente preparado para um novo cadastro público.");
      await load();
    } catch (err: any) {
      setError(err?.message || "Não foi possível preparar a jornada.");
    } finally {
      setBusy(null);
    }
  };

  const resetData = async () => {
    if (!window.confirm("Reiniciar a base demonstrativa? Os dados de demonstração deste tenant serão apagados e recriados. A conta criada pela Landing Page será mantida.")) return;
    setBusy("reset");
    setError("");
    try {
      const result = await apiFetch("/admin/trial-lab/reset-data", { method: "POST" });
      setNotice(result.message || "Dados demonstrativos restaurados.");
      await load();
    } catch (err: any) {
      setError(err?.message || "Não foi possível reiniciar a demonstração.");
    } finally {
      setBusy(null);
    }
  };

  const upgradeData = async () => {
    if (!window.confirm("Atualizar para a Base Demonstrativa v2? Serão adicionados novos exemplos sem apagar nenhum registro existente deste tenant.")) return;
    setBusy("upgrade");
    setError("");
    try {
      const result = await apiFetch("/admin/trial-lab/upgrade-data", { method: "POST" });
      setNotice(result.message || "Base Demonstrativa v2 atualizada.");
      await load();
    } catch (err: any) {
      setError(err?.message || "Não foi possível atualizar a demonstração.");
    } finally {
      setBusy(null);
    }
  };

  const identityIssues: string[] = lab ? [
    !lab.identity.configured && "Configure MIRAGE_TRIAL_LAB_EMAIL, MIRAGE_TRIAL_LAB_WHATSAPP e MIRAGE_TRIAL_LAB_COMPANY_NAME para liberar a jornada.",
    lab.identity.configured && !lab.identity.whatsapp_configured && "O WhatsApp reservado do Laboratório não está configurado.",
    !lab.checkout.sandbox_configured && "A chave de sandbox do Asaas não está configurada; o checkout de teste ficará bloqueado.",
    lab.checkout.sandbox_configured && !lab.checkout.sandbox_webhook_configured && "O token de webhook do sandbox Asaas não está configurado.",
  ].filter(Boolean) as string[] : [];

  return (
    <Layout>
      <div className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-violet-700 mb-2">
              <Beaker className="w-5 h-5" />
              <span className="font-semibold text-sm">Master Mirage</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Laboratório de Trial</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Checklist mestre para validar a jornada real: preparação, cadastro público, trial e dados demonstrativos.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading || busy !== null}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar jornada
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin">Voltar ao Admin</Link>
            </Button>
          </div>
        </div>

        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="p-4 flex gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">Jornada pública e ambiente isolado</p>
              <p className="mt-1">Esta tela nunca cria conta nem autentica o cliente. Ela prepara apenas a identidade reservada para que o cadastro aconteça pela Landing Page pública.</p>
            </div>
          </CardContent>
        </Card>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Carregando jornada…</div>
        ) : lab && (
          <>
            {identityIssues.length > 0 && (
              <Card className="border-red-200 bg-red-50/60">
                <CardContent className="p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-900 space-y-1">
                    <p className="font-semibold">Atenção à identidade e configurações</p>
                    {identityIssues.map((issue) => <p key={issue}>{issue}</p>)}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>1. Preparar nova jornada</CardTitle>
                  <CardDescription>Limpa a conta reservada anterior antes de iniciar um novo cadastro público.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatusLine label="Identidade reservada" value={lab.identity.configured ? `${lab.identity.company_name} · ${lab.identity.email}` : "Configuração pendente"} />
                  <StatusLine label="Conta atual" value={lab.account.exists ? "Cadastro público já concluído" : "Aguardando cadastro público"} />
                  <Button onClick={prepareJourney} disabled={!lab.identity.configured || busy !== null} variant="destructive" className="w-full">
                    {busy === "prepare" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                    Preparar jornada (apaga conta atual)
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>2. Fazer cadastro público</CardTitle>
                  <CardDescription>Abra a Landing Page em uma sessão separada e use a identidade reservada configurada.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatusLine label="E-mail público" value={lab.identity.email || "Não configurado"} />
                  <StatusLine label="Status" value={lab.account.exists ? `Criado em ${formatDate(lab.account.created_at, true)}` : "Ainda não criado"} />
                  {lab.identity.signup_url ? (
                    <Button asChild className="w-full" disabled={!lab.identity.configured}>
                      <a href={lab.identity.signup_url} target="_blank" rel="noreferrer">
                        Abrir cadastro público <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                  ) : (
                    <Button disabled className="w-full">Link de cadastro indisponível</Button>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-violet-600" /> Checklist da jornada</CardTitle>
                <CardDescription>Atualize após cada etapa para consultar os status retornados pelo servidor.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {lab.checklist.map((item) => {
                  const meta = statusMeta(item.status);
                  return (
                    <div key={item.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium">{item.label}</span>
                      <div className="flex items-center gap-3">
                        {item.updated_at && <span className="text-xs text-muted-foreground">{formatDate(item.updated_at, true)}</span>}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}>
                          <meta.Icon className="w-3.5 h-3.5" /> {meta.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><DatabaseZap className="w-5 h-5 text-violet-600" /> Dados demonstrativos</CardTitle>
                  <CardDescription>Atualize a v2 sem apagar registros ou use o reset apenas quando for necessário recomeçar a demonstração.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatusLine label="Tenant" value={lab.tenant ? `${lab.tenant.name} (${lab.tenant.slug})` : "Aguardando cadastro"} />
                  <StatusLine label="Trial" value={lab.tenant ? `${lab.tenant.assinatura_status} até ${formatDate(lab.tenant.assinatura_expira_em)}` : "—"} />
                  <StatusLine label="Base atual" value={lab.demo_seed_ready ? "Pronta para atualização v2" : "Use o reset para criar a base inicial"} />
                  <Button onClick={upgradeData} disabled={!lab.account.exists || !lab.tenant || !lab.demo_seed_ready || busy !== null} className="w-full">
                    {busy === "upgrade" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DatabaseZap className="w-4 h-4 mr-2" />}
                    Atualizar para Base Demonstrativa v2
                  </Button>
                  <Button onClick={resetData} disabled={!lab.account.exists || !lab.tenant || busy !== null} variant="outline" className="w-full">
                    {busy === "reset" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Resetar dados demonstrativos
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status de integrações</CardTitle>
                  <CardDescription>Controles de checkout ficam restritos ao sandbox separado.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatusLine label="Asaas sandbox" value={lab.checkout.sandbox_configured ? "Configurado" : "Não configurado"} />
                  <StatusLine label="Webhook sandbox" value={lab.checkout.sandbox_webhook_configured ? "Configurado" : "Não configurado"} />
                  <StatusLine label="Checkout simulado" value={lab.checkout.simulated_checkout_allowed ? "Permitido" : "Não permitido"} />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-all">{value}</p>
    </div>
  );
}