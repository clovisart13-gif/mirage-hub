import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play, RefreshCw, RotateCcw, Loader2, CheckCircle2, XCircle,
  Clock, AlertTriangle, Zap, Package, ListTodo, Brain,
  BarChart3, ArrowRight, Radio,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ADMIN_EMAIL = "clovisart13@gmail.com";

// ── helpers ──────────────────────────────────────────────────────────────────

type StatusKey =
  | "completed" | "ready" | "running" | "failed" | "pending" | "cancelled"
  | "delivered" | "pending_handoff" | "captured_by_replit" | "blocked";

const STATUS_STYLE: Record<string, string> = {
  completed:          "bg-green-100 text-green-800",
  ready:              "bg-blue-100 text-blue-800",
  running:            "bg-yellow-100 text-yellow-800",
  failed:             "bg-red-100 text-red-800",
  pending:            "bg-gray-100 text-gray-600",
  cancelled:          "bg-gray-200 text-gray-500",
  blocked:            "bg-orange-100 text-orange-700",
  delivered:          "bg-purple-100 text-purple-800",
  pending_handoff:    "bg-violet-100 text-violet-800",
  captured_by_replit: "bg-sky-100 text-sky-800",
};

const STATUS_LABEL: Record<string, string> = {
  pending_handoff:    "⏳ aguardando captura",
  captured_by_replit: "🤖 capturado",
  running:            "⚡ em execução",
  delivered:          "✅ entregue",
  completed:          "✓ concluído",
  failed:             "✗ falhou",
  pending:            "pendente",
  ready:              "pronta",
  cancelled:          "cancelada",
  blocked:            "bloqueada",
};

function statusBadge(status: string) {
  const cls = STATUS_STYLE[status] ?? "bg-gray-100 text-gray-600";
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function ts(v: string) {
  return new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`/api/atos${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ── Status Card ───────────────────────────────────────────────────────────────

function StatusCard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["atos-status"],
    queryFn: () => apiFetch("/status"),
    refetchInterval: 10000,
  });

  const { toast } = useToast();
  const qc = useQueryClient();

  const runNext = useMutation({
    mutationFn: () => apiFetch("/execute-next", { method: "POST", body: JSON.stringify({}) }),
    onSuccess: (d) => {
      if (d.skipped) toast({ title: "Fila vazia", description: "Nenhuma task ready." });
      else toast({ title: d.success ? "Task executada" : "Task falhou", description: `#${d.taskId} ${d.taskCode}`, variant: d.success ? "default" : "destructive" });
      qc.invalidateQueries({ queryKey: ["atos"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const runAll = useMutation({
    mutationFn: () => apiFetch("/run-until-empty", { method: "POST", body: JSON.stringify({ maxRuns: 20, timeoutMs: 60000 }) }),
    onSuccess: (d) => {
      toast({ title: `Fila processada`, description: `${d.completed} completas · ${d.failed} falhas · ${d.runsExecuted} execuções` });
      qc.invalidateQueries({ queryKey: ["atos"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const t = data?.tasks ?? {};
  const statItems = [
    { label: "Decisões",       value: data?.decisions ?? "—", icon: Brain,        color: "text-purple-600" },
    { label: "Prontas",        value: t.ready          ?? "—", icon: ListTodo,     color: "text-blue-600" },
    { label: "Concluídas",     value: t.completed      ?? "—", icon: CheckCircle2, color: "text-green-600" },
    { label: "Falhas",         value: t.failed         ?? "—", icon: XCircle,      color: "text-red-600" },
    { label: "Entregas",       value: data?.deliveries ?? "—", icon: Package,      color: "text-indigo-600" },
    { label: "Erros",          value: data?.errors     ?? "—", icon: AlertTriangle, color: "text-orange-600" },
  ];

  const handoffItems = [
    { label: "Aguard. captura", value: t.pending_handoff    ?? 0, color: "text-violet-600" },
    { label: "Capturadas",      value: t.captured_by_replit ?? 0, color: "text-sky-600" },
    { label: "Em execução",     value: t.running            ?? 0, color: "text-yellow-600" },
    { label: "Entregues",       value: t.delivered          ?? 0, color: "text-purple-600" },
  ];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-yellow-500" />
            ATOS — Painel Operacional
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button size="sm" variant="outline" onClick={() => runNext.mutate()} disabled={runNext.isPending}>
              {runNext.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
              Executar próxima
            </Button>
            <Button size="sm" onClick={() => runAll.mutate()} disabled={runAll.isPending} className="bg-blue-600 hover:bg-blue-700">
              {runAll.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
              Rodar fila completa
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {statItems.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* Ciclo Replit Agent */}
        <div className="border rounded-lg p-3 bg-violet-50">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-violet-700">
            <Radio className="w-3.5 h-3.5" />
            Ciclo Replit Agent — tasks replit_agent_handoff
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {handoffItems.map(({ label, value, color }, i) => (
              <div key={label} className="flex items-center gap-1">
                <div className="text-center">
                  <div className={`text-xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
                {i < handoffItems.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        {t.ready > 0 && (
          <div className="p-2 bg-blue-50 rounded text-sm text-blue-700 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {t.ready} task(s) aguardando execução
          </div>
        )}
        {(t.pending_handoff ?? 0) > 0 && (
          <div className="p-2 bg-violet-50 rounded text-sm text-violet-700 flex items-center gap-2">
            <Radio className="w-4 h-4" />
            {t.pending_handoff} task(s) aguardando captura pelo Replit Agent
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Task Events Timeline ───────────────────────────────────────────────────────

function TaskEventsTimeline({ taskId }: { taskId: number }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["atos", "task-events", taskId],
    queryFn: () => apiFetch(`/tasks/${taskId}/events`),
  });

  if (isLoading) return <div className="text-xs text-muted-foreground">Carregando histórico...</div>;
  if (events.length === 0) return <div className="text-xs text-muted-foreground">Nenhum evento registrado ainda.</div>;

  return (
    <div className="space-y-2">
      {events.map((ev: any) => (
        <div key={ev.id} className="flex items-start gap-2 text-xs">
          <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0 mt-1.5" />
          <div className="flex-1">
            <div className="flex items-center gap-1 flex-wrap">
              {ev.fromStatus && <>{statusBadge(ev.fromStatus)}<ArrowRight className="w-3 h-3 text-muted-foreground" /></>}
              {statusBadge(ev.toStatus)}
              <span className="text-muted-foreground ml-1">via {ev.origin}</span>
              <span className="text-muted-foreground ml-auto">{ts(ev.createdAt)}</span>
            </div>
            {ev.notes && <p className="text-muted-foreground mt-0.5 italic">{ev.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Decisions Tab ─────────────────────────────────────────────────────────────

function DecisionsTab() {
  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ["atos", "decisions"],
    queryFn: () => apiFetch("/decisions"),
  });
  const [selected, setSelected] = useState<number | null>(null);
  const { data: detail } = useQuery({
    queryKey: ["atos", "decisions", selected],
    queryFn: () => apiFetch(`/decisions/${selected}`),
    enabled: selected !== null,
  });

  if (isLoading) return <div className="p-6 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-2">
        {decisions.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma decisão registrada.</p>}
        {decisions.map((d: any) => (
          <div
            key={d.id}
            onClick={() => setSelected(d.id)}
            className={`p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${selected === d.id ? "border-blue-500 bg-blue-50" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">#{d.id} {d.title}</span>
              {statusBadge(d.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{d.summary}</p>
            <p className="text-xs text-muted-foreground">{ts(d.createdAt)}</p>
          </div>
        ))}
      </div>
      <div>
        {selected && detail ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">#{detail.id} {detail.title}</CardTitle>
              <p className="text-xs text-muted-foreground">{detail.summary}</p>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <p className="font-semibold mb-1">Tasks ({detail.tasks?.length ?? 0})</p>
                {detail.tasks?.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between py-1 border-b">
                    <span>{t.taskCode} — {t.title}</span>
                    {statusBadge(t.status)}
                  </div>
                ))}
              </div>
              {detail.deliveries?.length > 0 && (
                <div>
                  <p className="font-semibold mb-1">Entregas ({detail.deliveries.length})</p>
                  {detail.deliveries.map((d: any) => (
                    <div key={d.id} className="py-1 border-b">
                      <span className="font-medium">{d.title}</span>
                      <span className="text-muted-foreground ml-2">{ts(d.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
              {detail.errors?.length > 0 && (
                <div>
                  <p className="font-semibold text-red-600 mb-1">Erros ({detail.errors.length})</p>
                  {detail.errors.map((e: any) => (
                    <div key={e.id} className="py-1 border-b text-red-700">{e.errorMessage}</div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground border rounded-lg">
            Selecione uma decisão para ver detalhes
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tasks Tab ─────────────────────────────────────────────────────────────────

function TasksTab() {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ["atos", "tasks", filter],
    queryFn: () => apiFetch(`/tasks${filter !== "all" ? `?status=${filter}` : ""}`),
  });

  const retry = useMutation({
    mutationFn: (id: number) => apiFetch(`/tasks/${id}/ready`, { method: "POST" }),
    onSuccess: () => { toast({ title: "Task reprocessada" }); qc.invalidateQueries({ queryKey: ["atos"] }); },
  });

  const filters = [
    "all", "pending_handoff", "captured_by_replit", "running", "delivered",
    "ready", "completed", "failed", "pending", "cancelled",
  ];

  if (isLoading) return <div className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {filters.map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="text-xs h-7">
            {f === "all" ? "todas" : STATUS_LABEL[f] ?? f}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => refetch()} className="text-xs h-7">
          <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
        </Button>
      </div>
      <div className="space-y-2">
        {tasks.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma task encontrada.</p>}
        {tasks.map((t: any) => (
          <div key={t.id} className="rounded-lg border overflow-hidden">
            <div
              className="p-3 flex items-start justify-between gap-3 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setExpanded(expanded === t.id ? null : t.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">#{t.id}</span>
                  <span className="font-medium text-sm">{t.taskCode}</span>
                  {statusBadge(t.status)}
                  <span className="text-xs text-muted-foreground">{t.taskType}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{t.title}</p>
                {t.resultJson && (
                  <p className="text-xs text-green-700 mt-1">
                    ✓ {JSON.stringify(t.resultJson).slice(0, 80)}
                  </p>
                )}
                {t.errorJson && (
                  <p className="text-xs text-red-700 mt-1">
                    ✗ {(t.errorJson as any)?.message ?? JSON.stringify(t.errorJson).slice(0, 80)}
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {(t.status === "failed" || t.status === "cancelled") && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); retry.mutate(t.id); }} disabled={retry.isPending}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Reprocessar
                  </Button>
                )}
              </div>
            </div>
            {expanded === t.id && (
              <div className="px-4 pb-3 border-t bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground mt-2 mb-1.5">Timeline de eventos</p>
                <TaskEventsTimeline taskId={t.id} />
                {t.description && (
                  <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{t.description}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Errors Tab ────────────────────────────────────────────────────────────────

function ErrorsTab() {
  const { data: errors = [], isLoading } = useQuery({
    queryKey: ["atos", "errors"],
    queryFn: () => apiFetch("/errors?limit=50"),
  });

  if (isLoading) return <div className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-2">
      {errors.length === 0 && <p className="text-sm text-muted-foreground">Nenhum erro registrado.</p>}
      {errors.map((e: any) => (
        <div key={e.id} className="p-3 rounded-lg border border-red-200 bg-red-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-800">{e.errorMessage}</span>
            <span className="text-xs text-muted-foreground">{ts(e.createdAt)}</span>
          </div>
          <div className="text-xs text-red-600 mt-1">
            source: {e.source} {e.taskId ? `· task #${e.taskId}` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Deliveries Tab ────────────────────────────────────────────────────────────

function DeliveriesTab() {
  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["atos", "deliveries"],
    queryFn: () => apiFetch("/deliveries?limit=30"),
  });
  const [selected, setSelected] = useState<any>(null);

  if (isLoading) return <div className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-2">
        {deliveries.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma entrega registrada ainda. O Replit Agent registra entregas via POST /api/atos/deliveries.</p>
        )}
        {deliveries.map((d: any) => (
          <div
            key={d.id}
            onClick={() => setSelected(d)}
            className={`p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${selected?.id === d.id ? "border-purple-500 bg-purple-50" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{d.title}</span>
              {statusBadge(d.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{d.source} · {ts(d.createdAt)}</p>
            {d.relatedDecisionId && <p className="text-xs text-muted-foreground">Decision #{d.relatedDecisionId}</p>}
          </div>
        ))}
      </div>
      <div>
        {selected ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{selected.title}</CardTitle>
              <p className="text-xs text-muted-foreground">{selected.summary}</p>
            </CardHeader>
            <CardContent className="text-xs space-y-3">
              {selected.filesChangedJson && (
                <div>
                  <p className="font-semibold mb-1">Arquivos alterados</p>
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">{JSON.stringify(selected.filesChangedJson, null, 2)}</pre>
                </div>
              )}
              {selected.endpointsChangedJson && (
                <div>
                  <p className="font-semibold mb-1">Endpoints</p>
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">{JSON.stringify(selected.endpointsChangedJson, null, 2)}</pre>
                </div>
              )}
              {selected.validationJson && (
                <div>
                  <p className="font-semibold mb-1">Validação</p>
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">{JSON.stringify(selected.validationJson, null, 2)}</pre>
                </div>
              )}
              {selected.databaseChangesJson && (
                <div>
                  <p className="font-semibold mb-1">Mudanças no banco</p>
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">{JSON.stringify(selected.databaseChangesJson, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground border rounded-lg">
            Selecione uma entrega para ver detalhes
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AtosPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4">
        <AlertTriangle className="w-10 h-10 text-yellow-500" />
        <p className="text-muted-foreground">Acesso restrito ao administrador.</p>
        <Button onClick={() => navigate("/hub")}>Voltar ao Hub</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Zap className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ATOS — Sistema Operacional</h1>
            <p className="text-sm text-muted-foreground">Decisões · Planos · Execução autônoma de tasks</p>
          </div>
        </div>

        <StatusCard />

        <Tabs defaultValue="tasks">
          <TabsList className="mb-4">
            <TabsTrigger value="decisions" className="flex items-center gap-1">
              <Brain className="w-4 h-4" /> Decisões
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-1">
              <ListTodo className="w-4 h-4" /> Tasks
            </TabsTrigger>
            <TabsTrigger value="errors" className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Erros
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="flex items-center gap-1">
              <Package className="w-4 h-4" /> Entregas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="decisions"><DecisionsTab /></TabsContent>
          <TabsContent value="tasks"><TasksTab /></TabsContent>
          <TabsContent value="errors"><ErrorsTab /></TabsContent>
          <TabsContent value="deliveries"><DeliveriesTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
