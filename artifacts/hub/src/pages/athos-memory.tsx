import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Brain, Building2, Globe, Layers, BarChart3, Plus, Edit3, Save,
  Trash2, RefreshCw, ChevronDown, ChevronRight, ArrowLeft,
  CheckCircle2, Clock, AlertCircle, Eye, FileText,
} from "lucide-react";

const ADMIN_EMAIL = "clovisart13@gmail.com";

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`/api/athos-memory${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    credentials: "include",
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? "Erro desconhecido");
  return data;
}

function ts(v: string) {
  return new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    official: "bg-green-100 text-green-800",
    validated: "bg-blue-100 text-blue-800",
    draft: "bg-yellow-100 text-yellow-800",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[s] ?? "bg-gray-100 text-gray-600"}`}>
      {s}
    </span>
  );
}

function confidenceBadge(c: string | number | null) {
  const score = typeof c === "string" ? parseFloat(c) : (c ?? 0);
  const color = score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-500";
  return <span className={`text-xs font-mono font-semibold ${color}`}>{score.toFixed(0)}%</span>;
}

// ── JSON Editor ───────────────────────────────────────────────────────────────

function JsonEditor({ label, value, onChange }: { label: string; value: unknown; onChange: (v: unknown) => void }) {
  const [raw, setRaw] = useState(JSON.stringify(value ?? {}, null, 2));
  const [error, setError] = useState("");

  function handleChange(s: string) {
    setRaw(s);
    try {
      onChange(JSON.parse(s));
      setError("");
    } catch {
      setError("JSON inválido");
    }
  }

  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <textarea
        value={raw}
        onChange={e => handleChange(e.target.value)}
        rows={6}
        className={`w-full text-xs font-mono rounded-lg border px-3 py-2 resize-y bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400 ${error ? "border-red-400" : "border-gray-200"}`}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Collapsible Section ───────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-4 space-y-4 bg-white">{children}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// BLUEPRINTS TAB
// ════════════════════════════════════════════════════════════════════════════════

type Blueprint = {
  id: number; companySlug: string; companyName: string; type: string;
  brandIdentityJson: unknown; positioningJson: unknown; audienceJson: unknown;
  offersJson: unknown; channelsJson: unknown; operationsJson: unknown;
  goalsJson: unknown; objectionsJson: unknown; competitorsJson: unknown;
  visualSystemJson: unknown; strategicNotesJson: unknown;
  confidenceScore: string | null; status: string; updatedAt: string;
};

function BlueprintForm({ initial, onSave, onCancel }: {
  initial?: Partial<Blueprint>;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Record<string, unknown>>({
    company_slug: initial?.companySlug ?? "",
    company_name: initial?.companyName ?? "",
    type: initial?.type ?? "other",
    brand_identity: initial?.brandIdentityJson ?? {},
    positioning: initial?.positioningJson ?? {},
    audience: initial?.audienceJson ?? {},
    offers: initial?.offersJson ?? {},
    channels: initial?.channelsJson ?? {},
    operations: initial?.operationsJson ?? {},
    goals: initial?.goalsJson ?? {},
    objections: initial?.objectionsJson ?? {},
    competitors: initial?.competitorsJson ?? {},
    visual_system: initial?.visualSystemJson ?? {},
    strategic_notes: initial?.strategicNotesJson ?? {},
    confidence_score: initial?.confidenceScore ?? "0",
    status: initial?.status ?? "draft",
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Slug</label>
          <input value={form.company_slug as string} onChange={e => setForm(f => ({ ...f, company_slug: e.target.value }))}
            disabled={!!initial?.companySlug}
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:bg-gray-50 disabled:text-gray-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nome</label>
          <input value={form.company_name as string} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tipo</label>
          <select value={form.type as string} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="mirage">mirage</option>
            <option value="r2pb">r2pb</option>
            <option value="other">other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</label>
          <select value={form.status as string} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="draft">draft</option>
            <option value="validated">validated</option>
            <option value="official">official</option>
          </select>
        </div>
      </div>

      <Section title="Brand Identity"><JsonEditor label="brand_identity" value={form.brand_identity} onChange={v => setForm(f => ({ ...f, brand_identity: v }))} /></Section>
      <Section title="Positioning"><JsonEditor label="positioning" value={form.positioning} onChange={v => setForm(f => ({ ...f, positioning: v }))} /></Section>
      <Section title="Audience"><JsonEditor label="audience" value={form.audience} onChange={v => setForm(f => ({ ...f, audience: v }))} /></Section>
      <Section title="Offers"><JsonEditor label="offers" value={form.offers} onChange={v => setForm(f => ({ ...f, offers: v }))} /></Section>
      <Section title="Channels"><JsonEditor label="channels" value={form.channels} onChange={v => setForm(f => ({ ...f, channels: v }))} /></Section>
      <Section title="Operations"><JsonEditor label="operations" value={form.operations} onChange={v => setForm(f => ({ ...f, operations: v }))} /></Section>
      <Section title="Goals"><JsonEditor label="goals" value={form.goals} onChange={v => setForm(f => ({ ...f, goals: v }))} /></Section>
      <Section title="Objections / Risks"><JsonEditor label="objections" value={form.objections} onChange={v => setForm(f => ({ ...f, objections: v }))} /></Section>
      <Section title="Competitors"><JsonEditor label="competitors" value={form.competitors} onChange={v => setForm(f => ({ ...f, competitors: v }))} /></Section>
      <Section title="Visual System"><JsonEditor label="visual_system" value={form.visual_system} onChange={v => setForm(f => ({ ...f, visual_system: v }))} /></Section>
      <Section title="Strategic Notes"><JsonEditor label="strategic_notes" value={form.strategic_notes} onChange={v => setForm(f => ({ ...f, strategic_notes: v }))} /></Section>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Confidence Score (0–100)</label>
        <input type="number" min={0} max={100} value={form.confidence_score as string}
          onChange={e => setForm(f => ({ ...f, confidence_score: e.target.value }))}
          className="w-32 text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400" />
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={() => onSave(form)}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <Save className="w-4 h-4" /> Salvar
        </button>
        <button onClick={onCancel} className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function BlueprintsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Blueprint | null | "new">(null);

  const { data, isLoading } = useQuery({
    queryKey: ["athos-blueprints"],
    queryFn: () => apiFetch("/blueprints"),
  });

  const save = useMutation({
    mutationFn: (d: Record<string, unknown>) => apiFetch("/blueprints", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["athos-blueprints"] }); setEditing(null); toast.success("Blueprint salvo"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (slug: string) => apiFetch(`/blueprints/${slug}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["athos-blueprints"] }); toast.success("Removido"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const blueprints: Blueprint[] = data?.blueprints ?? [];

  if (editing !== null) {
    return (
      <div>
        <button onClick={() => setEditing(null)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h3 className="text-base font-bold text-gray-800 mb-4">
          {editing === "new" ? "Novo Blueprint" : `Editando: ${(editing as Blueprint).companyName}`}
        </h3>
        <BlueprintForm
          initial={editing === "new" ? undefined : (editing as Blueprint)}
          onSave={d => save.mutate(d)}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{blueprints.length} empresa(s) configurada(s)</p>
        <button onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors">
          <Plus className="w-3 h-3" /> Novo Blueprint
        </button>
      </div>
      {isLoading && <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>}
      {blueprints.map(bp => (
        <div key={bp.id} className="border border-gray-100 rounded-xl p-4 hover:border-violet-200 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-gray-900">{bp.companyName}</span>
                <span className="text-xs text-gray-400 font-mono">{bp.companySlug}</span>
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{bp.type}</span>
                {statusBadge(bp.status)}
                {confidenceBadge(bp.confidenceScore)}
              </div>
              <p className="text-xs text-gray-400 mt-1">Atualizado: {ts(bp.updatedAt)}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setEditing(bp)}
                className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors">
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={() => { if (confirm(`Remover blueprint de ${bp.companyName}?`)) del.mutate(bp.companySlug); }}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
      {!isLoading && blueprints.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Brain className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum blueprint cadastrado ainda.</p>
          <p className="text-xs mt-1">Crie o Mirage Blueprint e o R2PB Blueprint para começar.</p>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MARKET INTELLIGENCE TAB
// ════════════════════════════════════════════════════════════════════════════════

type MarketProfile = {
  id: number; domainKey: string; title: string;
  marketSummaryJson: unknown; customerBehaviorJson: unknown; painsJson: unknown;
  opportunitiesJson: unknown; threatsJson: unknown; competitorsJson: unknown;
  trendsJson: unknown; terminologyJson: unknown;
  confidenceScore: string | null; status: string; updatedAt: string;
};

function MarketForm({ initial, onSave, onCancel }: {
  initial?: Partial<MarketProfile>;
  onSave: (d: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Record<string, unknown>>({
    domain_key: initial?.domainKey ?? "",
    title: initial?.title ?? "",
    market_summary: initial?.marketSummaryJson ?? {},
    customer_behavior: initial?.customerBehaviorJson ?? {},
    pains: initial?.painsJson ?? {},
    opportunities: initial?.opportunitiesJson ?? {},
    threats: initial?.threatsJson ?? {},
    competitors: initial?.competitorsJson ?? {},
    trends: initial?.trendsJson ?? {},
    terminology: initial?.terminologyJson ?? {},
    confidence_score: initial?.confidenceScore ?? "0",
    status: initial?.status ?? "draft",
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Domain Key</label>
          <input value={form.domain_key as string} onChange={e => setForm(f => ({ ...f, domain_key: e.target.value }))}
            disabled={!!initial?.domainKey}
            placeholder="ex: saas_confeccao"
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:bg-gray-50 disabled:text-gray-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Título</label>
          <input value={form.title as string} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</label>
          <select value={form.status as string} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="draft">draft</option>
            <option value="validated">validated</option>
            <option value="official">official</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Confidence Score (0–100)</label>
          <input type="number" min={0} max={100} value={form.confidence_score as string}
            onChange={e => setForm(f => ({ ...f, confidence_score: e.target.value }))}
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>
      </div>

      <Section title="Market Summary"><JsonEditor label="market_summary" value={form.market_summary} onChange={v => setForm(f => ({ ...f, market_summary: v }))} /></Section>
      <Section title="Customer Behavior"><JsonEditor label="customer_behavior" value={form.customer_behavior} onChange={v => setForm(f => ({ ...f, customer_behavior: v }))} /></Section>
      <Section title="Pains"><JsonEditor label="pains" value={form.pains} onChange={v => setForm(f => ({ ...f, pains: v }))} /></Section>
      <Section title="Opportunities"><JsonEditor label="opportunities" value={form.opportunities} onChange={v => setForm(f => ({ ...f, opportunities: v }))} /></Section>
      <Section title="Threats"><JsonEditor label="threats" value={form.threats} onChange={v => setForm(f => ({ ...f, threats: v }))} /></Section>
      <Section title="Competitors"><JsonEditor label="competitors" value={form.competitors} onChange={v => setForm(f => ({ ...f, competitors: v }))} /></Section>
      <Section title="Trends"><JsonEditor label="trends" value={form.trends} onChange={v => setForm(f => ({ ...f, trends: v }))} /></Section>
      <Section title="Terminology"><JsonEditor label="terminology" value={form.terminology} onChange={v => setForm(f => ({ ...f, terminology: v }))} /></Section>

      <div className="flex gap-2 pt-2">
        <button onClick={() => onSave(form)}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <Save className="w-4 h-4" /> Salvar
        </button>
        <button onClick={onCancel} className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function MarketTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<MarketProfile | null | "new">(null);

  const { data, isLoading } = useQuery({
    queryKey: ["athos-market"],
    queryFn: () => apiFetch("/market"),
  });

  const save = useMutation({
    mutationFn: (d: Record<string, unknown>) => apiFetch("/market", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["athos-market"] }); setEditing(null); toast.success("Perfil salvo"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (key: string) => apiFetch(`/market/${key}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["athos-market"] }); toast.success("Removido"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const profiles: MarketProfile[] = data?.profiles ?? [];

  if (editing !== null) {
    return (
      <div>
        <button onClick={() => setEditing(null)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h3 className="text-base font-bold text-gray-800 mb-4">
          {editing === "new" ? "Novo Dossiê de Mercado" : `Editando: ${(editing as MarketProfile).title}`}
        </h3>
        <MarketForm
          initial={editing === "new" ? undefined : (editing as MarketProfile)}
          onSave={d => save.mutate(d)}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{profiles.length} dossiê(s) de mercado</p>
        <button onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors">
          <Plus className="w-3 h-3" /> Novo Dossiê
        </button>
      </div>
      {isLoading && <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>}
      {profiles.map(p => (
        <div key={p.id} className="border border-gray-100 rounded-xl p-4 hover:border-violet-200 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-gray-900">{p.title}</span>
                <span className="text-xs text-gray-400 font-mono">{p.domainKey}</span>
                {statusBadge(p.status)}
                {confidenceBadge(p.confidenceScore)}
              </div>
              <p className="text-xs text-gray-400 mt-1">Atualizado: {ts(p.updatedAt)}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setEditing(p)} className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors">
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={() => { if (confirm(`Remover dossiê "${p.title}"?`)) del.mutate(p.domainKey); }}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
      {!isLoading && profiles.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum dossiê cadastrado.</p>
          <p className="text-xs mt-1">Crie dossiês para saas_confeccao e private_label_premium.</p>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// STRATEGIC MEMORY ENTRIES TAB
// ════════════════════════════════════════════════════════════════════════════════

type MemoryEntry = {
  id: number; entityType: string; entityKey: string; category: string;
  title: string; content: string; sourceType: string; confidenceLevel: string;
  tags: unknown; createdAt: string; updatedAt: string;
};

function EntriesTab() {
  const qc = useQueryClient();
  const [filterKey, setFilterKey] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterQ, setFilterQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({
    entity_type: "company", entity_key: "", category: "positioning",
    title: "", content: "", source_type: "manual", confidence_level: "medium",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["athos-entries", filterKey, filterCat, filterQ],
    queryFn: () => {
      const p = new URLSearchParams();
      if (filterKey) p.set("entity_key", filterKey);
      if (filterCat) p.set("category", filterCat);
      if (filterQ) p.set("q", filterQ);
      return apiFetch(`/entries?${p}`);
    },
  });

  const create = useMutation({
    mutationFn: (d: typeof newEntry) => apiFetch("/entries", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["athos-entries"] }); setAdding(false);
      toast.success("Entrada adicionada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: number) => apiFetch(`/entries/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["athos-entries"] }); toast.success("Removido"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const entries: MemoryEntry[] = data?.entries ?? [];

  const confidenceLevelColor: Record<string, string> = {
    verified: "bg-green-100 text-green-700",
    high: "bg-blue-100 text-blue-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <input value={filterKey} onChange={e => setFilterKey(e.target.value)} placeholder="entity_key (r2pb, mirage...)"
          className="text-sm rounded-lg border border-gray-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400 w-44" />
        <input value={filterCat} onChange={e => setFilterCat(e.target.value)} placeholder="categoria"
          className="text-sm rounded-lg border border-gray-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400 w-36" />
        <input value={filterQ} onChange={e => setFilterQ(e.target.value)} placeholder="buscar no conteúdo..."
          className="text-sm rounded-lg border border-gray-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400 flex-1 min-w-[120px]" />
        <button onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors ml-auto">
          <Plus className="w-3 h-3" /> Nova Entrada
        </button>
      </div>

      {adding && (
        <div className="border border-violet-200 rounded-xl p-4 bg-violet-50 space-y-3">
          <h4 className="text-sm font-bold text-violet-800">Nova Entrada de Memória</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Entity Type</label>
              <select value={newEntry.entity_type} onChange={e => setNewEntry(n => ({ ...n, entity_type: e.target.value }))}
                className="w-full text-sm rounded-lg border border-gray-200 px-2 py-1.5">
                <option value="company">company</option>
                <option value="market">market</option>
                <option value="product">product</option>
                <option value="decision">decision</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Entity Key</label>
              <input value={newEntry.entity_key} onChange={e => setNewEntry(n => ({ ...n, entity_key: e.target.value }))}
                placeholder="r2pb, mirage, saas_confeccao..."
                className="w-full text-sm rounded-lg border border-gray-200 px-2 py-1.5" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Categoria</label>
              <input value={newEntry.category} onChange={e => setNewEntry(n => ({ ...n, category: e.target.value }))}
                placeholder="positioning, audience, ops..."
                className="w-full text-sm rounded-lg border border-gray-200 px-2 py-1.5" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Confidence</label>
              <select value={newEntry.confidence_level} onChange={e => setNewEntry(n => ({ ...n, confidence_level: e.target.value }))}
                className="w-full text-sm rounded-lg border border-gray-200 px-2 py-1.5">
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="verified">verified</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Source</label>
              <select value={newEntry.source_type} onChange={e => setNewEntry(n => ({ ...n, source_type: e.target.value }))}
                className="w-full text-sm rounded-lg border border-gray-200 px-2 py-1.5">
                <option value="manual">manual</option>
                <option value="chat_synthesis">chat_synthesis</option>
                <option value="snapshot">snapshot</option>
                <option value="analysis">analysis</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Título</label>
              <input value={newEntry.title} onChange={e => setNewEntry(n => ({ ...n, title: e.target.value }))}
                className="w-full text-sm rounded-lg border border-gray-200 px-2 py-1.5" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Conteúdo</label>
              <textarea value={newEntry.content} onChange={e => setNewEntry(n => ({ ...n, content: e.target.value }))}
                rows={4} className="w-full text-sm rounded-lg border border-gray-200 px-2 py-1.5 resize-y" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => create.mutate(newEntry)} disabled={create.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors">
              <Save className="w-3 h-3" /> Salvar
            </button>
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 border border-gray-200 text-xs text-gray-600 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>}
      <div className="space-y-2">
        {entries.map(e => (
          <div key={e.id} className="border border-gray-100 rounded-xl p-3 hover:border-violet-100 transition-colors">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold text-gray-800">{e.title}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-mono">{e.entityKey}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded">{e.category}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${confidenceLevelColor[e.confidenceLevel] ?? "bg-gray-100 text-gray-500"}`}>{e.confidenceLevel}</span>
                  <span className="text-xs text-gray-300">{e.sourceType}</span>
                </div>
                <p className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-3">{e.content}</p>
                <p className="text-xs text-gray-300 mt-1">{ts(e.createdAt)}</p>
              </div>
              <button onClick={() => { if (confirm("Remover esta entrada?")) del.mutate(e.id); }}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {!isLoading && entries.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma entrada de memória.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// EXECUTIVE SNAPSHOTS TAB
// ════════════════════════════════════════════════════════════════════════════════

type Snapshot = {
  id: number; companySlug: string; summaryJson: unknown; prioritiesJson: unknown;
  risksJson: unknown; opportunitiesJson: unknown; metricsJson: unknown;
  currentStage: string | null; status: string; updatedAt: string;
};

function SnapshotForm({ initial, onSave, onCancel }: {
  initial?: Partial<Snapshot>;
  onSave: (d: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Record<string, unknown>>({
    company_slug: initial?.companySlug ?? "",
    summary: initial?.summaryJson ?? {},
    priorities: initial?.prioritiesJson ?? {},
    risks: initial?.risksJson ?? {},
    opportunities: initial?.opportunitiesJson ?? {},
    metrics: initial?.metricsJson ?? {},
    current_stage: initial?.currentStage ?? "",
    status: initial?.status ?? "draft",
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Company Slug</label>
          <input value={form.company_slug as string} onChange={e => setForm(f => ({ ...f, company_slug: e.target.value }))}
            disabled={!!initial?.companySlug}
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:bg-gray-50 disabled:text-gray-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Current Stage</label>
          <input value={form.current_stage as string} onChange={e => setForm(f => ({ ...f, current_stage: e.target.value }))}
            placeholder="ex: validação mercado, scale..."
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</label>
          <select value={form.status as string} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="draft">draft</option>
            <option value="validated">validated</option>
            <option value="official">official</option>
          </select>
        </div>
      </div>
      <Section title="Summary (JSON livre)"><JsonEditor label="summary" value={form.summary} onChange={v => setForm(f => ({ ...f, summary: v }))} /></Section>
      <Section title="Priorities"><JsonEditor label="priorities" value={form.priorities} onChange={v => setForm(f => ({ ...f, priorities: v }))} /></Section>
      <Section title="Risks"><JsonEditor label="risks" value={form.risks} onChange={v => setForm(f => ({ ...f, risks: v }))} /></Section>
      <Section title="Opportunities"><JsonEditor label="opportunities" value={form.opportunities} onChange={v => setForm(f => ({ ...f, opportunities: v }))} /></Section>
      <Section title="Metrics"><JsonEditor label="metrics" value={form.metrics} onChange={v => setForm(f => ({ ...f, metrics: v }))} /></Section>
      <div className="flex gap-2 pt-2">
        <button onClick={() => onSave(form)}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <Save className="w-4 h-4" /> Salvar
        </button>
        <button onClick={onCancel} className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function SnapshotsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Snapshot | null | "new">(null);

  const { data, isLoading } = useQuery({
    queryKey: ["athos-snapshots"],
    queryFn: () => apiFetch("/snapshots"),
  });

  const save = useMutation({
    mutationFn: (d: Record<string, unknown>) => apiFetch("/snapshots", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["athos-snapshots"] }); setEditing(null); toast.success("Snapshot salvo"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (slug: string) => apiFetch(`/snapshots/${slug}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["athos-snapshots"] }); toast.success("Removido"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const snapshots: Snapshot[] = data?.snapshots ?? [];

  if (editing !== null) {
    return (
      <div>
        <button onClick={() => setEditing(null)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h3 className="text-base font-bold text-gray-800 mb-4">
          {editing === "new" ? "Novo Snapshot" : `Editando: ${(editing as Snapshot).companySlug}`}
        </h3>
        <SnapshotForm
          initial={editing === "new" ? undefined : (editing as Snapshot)}
          onSave={d => save.mutate(d)}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{snapshots.length} snapshot(s) executivo(s)</p>
        <button onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors">
          <Plus className="w-3 h-3" /> Novo Snapshot
        </button>
      </div>
      {isLoading && <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>}
      {snapshots.map(s => (
        <div key={s.id} className="border border-gray-100 rounded-xl p-4 hover:border-violet-200 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-gray-900 font-mono">{s.companySlug}</span>
                {s.currentStage && <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{s.currentStage}</span>}
                {statusBadge(s.status)}
              </div>
              <p className="text-xs text-gray-400 mt-1">Atualizado: {ts(s.updatedAt)}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setEditing(s)} className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors">
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={() => { if (confirm(`Remover snapshot de ${s.companySlug}?`)) del.mutate(s.companySlug); }}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
      {!isLoading && snapshots.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum snapshot executivo.</p>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════

type Tab = "blueprints" | "market" | "entries" | "snapshots";

const TABS: { key: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: "blueprints", label: "Blueprints", icon: Building2 },
  { key: "market",     label: "Inteligência de Mercado", icon: Globe },
  { key: "entries",    label: "Memória Estratégica", icon: Layers },
  { key: "snapshots",  label: "Snapshots Executivos", icon: BarChart3 },
];

export default function AthosMemory() {
  const { user } = useAuth();
  const [, nav] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("blueprints");

  if (!user || (user as any).email !== ADMIN_EMAIL) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-gray-600 text-sm">Acesso restrito ao administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => nav("/hub/mentor")} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-violet-600" />
              <h1 className="text-xl font-bold text-gray-900">ATHOS Memory</h1>
              <span className="text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">Base 360°</span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">Consciência estratégica persistente — separada do histórico de chat</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === key
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {activeTab === "blueprints" && <BlueprintsTab />}
          {activeTab === "market"     && <MarketTab />}
          {activeTab === "entries"    && <EntriesTab />}
          {activeTab === "snapshots"  && <SnapshotsTab />}
        </div>
      </div>
    </div>
  );
}
