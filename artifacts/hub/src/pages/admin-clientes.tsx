import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, ArrowRight, Beaker, CalendarClock, Check, ChevronRight,
  CircleAlert, ClipboardList, ExternalLink, Mail, MessageCircle,
  RefreshCw, Search, SlidersHorizontal, Users, X,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type ContactStatus = "novo" | "em_contato" | "retornar" | "concluido";
type Category = "all" | "trial_ativo" | "trial_encerrado" | "ativa" | "pagamento_atrasado" | "cadastro_pendente";
type Cadastro = {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  whatsapp: string | null;
  source: string | null;
  created_at: string | null;
  plan: string | null;
  assinatura_status: string | null;
  status_operacional: string;
  activation_issue?: string | null;
  assinatura_expira_em: string | null;
  is_trial_lab: boolean;
  is_test: boolean;
  contact_status: string;
  notes: string | null;
  next_action_at: string | null;
};
type Draft = { contact_status: ContactStatus; notes: string; next_action_at: string; is_test: boolean };

const categories: { key: Category; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "trial_ativo", label: "Trial ativo" },
  { key: "trial_encerrado", label: "Trial encerrado" },
  { key: "ativa", label: "Assinantes" },
  { key: "pagamento_atrasado", label: "Pagamento atrasado" },
  { key: "cadastro_pendente", label: "Cadastro pendente" },
];
const contactStatuses: { key: ContactStatus; label: string }[] = [
  { key: "novo", label: "Novo" },
  { key: "em_contato", label: "Em contato" },
  { key: "retornar", label: "Retornar" },
  { key: "concluido", label: "Concluído" },
];

function readCategory(): Category {
  const value = new URLSearchParams(window.location.search).get("status");
  return categories.find((category) => category.key === value)?.key ?? "all";
}

function operationalLabel(value: string) {
  return categories.find((category) => category.key === value)?.label ?? (value ? value.replaceAll("_", " ") : "Não informado");
}

function contactLabel(value: string) {
  return contactStatuses.find((status) => status.key === value)?.label ?? "Novo";
}

function formattedDate(value: string | null, time = false) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";
  return date.toLocaleDateString("pt-BR", time ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "short", year: "numeric" });
}

function followupDate(value: string | null) {
  if (!value) return "Sem retorno agendado";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "Data não informada";
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function due(value: string | null) {
  if (!value) return false;
  const day = value.slice(0, 10);
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && day <= localToday;
}

function publicLinks(item: Cadastro) {
  if (item.is_test || item.is_trial_lab) return { email: null, whatsapp: null, reason: "Contato de teste ou laboratório: ações externas indisponíveis." };
  const email = item.email?.trim() ?? "";
  const digits = (item.whatsapp ?? "").replace(/\D/g, "");
  const phone = digits.length >= 10 && digits.length <= 13 ? (digits.startsWith("55") ? digits : `55${digits}`) : "";
  return {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}` : null,
    whatsapp: phone.length >= 12 && phone.length <= 13 ? `https://wa.me/${phone}` : null,
    reason: null,
  };
}

function pillForOperational(value: string) {
  switch (value) {
    case "trial_ativo": return "bg-sky-50 text-sky-800 ring-sky-200";
    case "trial_encerrado": return "bg-rose-50 text-rose-800 ring-rose-200";
    case "ativa": return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "pagamento_atrasado": return "bg-amber-50 text-amber-900 ring-amber-200";
    default: return "bg-stone-100 text-stone-700 ring-stone-200";
  }
}

function ContactActions({ item, compact = false }: { item: Cadastro; compact?: boolean }) {
  const links = publicLinks(item);
  return (
    <div className={`flex flex-wrap items-center ${compact ? "gap-1.5" : "gap-2"}`}>
      {links.email ? (
        <a data-testid={`link-email-${item.id}`} href={links.email} aria-label={`Enviar e-mail para ${item.company_name}`} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs font-semibold text-stone-700 transition-colors hover:border-violet-300 hover:text-violet-800"><Mail className="h-3.5 w-3.5" /> E-mail</a>
      ) : !compact && <span className="text-xs text-stone-500">E-mail ausente ou inválido</span>}
      {links.whatsapp ? (
        <a data-testid={`link-whatsapp-${item.id}`} href={links.whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`Abrir WhatsApp de ${item.company_name}`} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs font-semibold text-stone-700 transition-colors hover:border-violet-300 hover:text-violet-800"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp <ExternalLink className="h-3 w-3" /></a>
      ) : !compact && <span className="text-xs text-stone-500">WhatsApp ausente ou inválido</span>}
      {links.reason && !compact && <p className="w-full text-xs text-amber-800">{links.reason}</p>}
    </div>
  );
}

export default function AdminClientes() {
  const { toast } = useToast();
  const [items, setItems] = useState<Cadastro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>(readCategory);
  const [includeTests, setIncludeTests] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/billing/admin/cadastros");
      if (!response || !Array.isArray(response.items)) throw new Error("A lista de cadastros veio em um formato inesperado.");
      setItems(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os contatos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(true); }, [load]);
  useEffect(() => {
    const onPopState = () => setCategory(readCategory());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const changeCategory = (next: Category) => {
    setCategory(next);
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("status");
    else url.searchParams.set("status", next);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const visiblePool = useMemo(() => items.filter((item) => includeTests || (!item.is_test && !item.is_trial_lab)), [items, includeTests]);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return visiblePool
      .filter((item) => category === "all" || item.status_operacional === category)
      .filter((item) => !term || [item.company_name, item.contact_name, item.email].some((part) => part?.toLocaleLowerCase("pt-BR").includes(term)))
      .sort((a, b) => {
        const aDue = due(a.next_action_at) && a.contact_status !== "concluido" ? 1 : 0;
        const bDue = due(b.next_action_at) && b.contact_status !== "concluido" ? 1 : 0;
        return bDue - aDue || (b.created_at ?? "").localeCompare(a.created_at ?? "");
      });
  }, [visiblePool, category, query]);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const attention = visiblePool.filter((item) => due(item.next_action_at) && item.contact_status !== "concluido").length;
  const newCount = visiblePool.filter((item) => item.contact_status === "novo").length;
  const activeCount = visiblePool.filter((item) => item.status_operacional === "ativa").length;

  const openDetail = (item: Cadastro) => {
    setSelectedId(item.id);
    setDraft({
      contact_status: contactStatuses.some((status) => status.key === item.contact_status) ? item.contact_status as ContactStatus : "novo",
      notes: item.notes ?? "",
      next_action_at: item.next_action_at?.slice(0, 10) ?? "",
      is_test: item.is_test,
    });
    setSaveError("");
  };

  const save = async () => {
    if (!selected || !draft || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await apiFetch(`/billing/admin/cadastros/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          contact_status: draft.contact_status,
          notes: draft.notes.trim() || null,
          next_action_at: draft.next_action_at || null,
          is_test: draft.is_test,
        }),
      });
      setSelectedId(null);
      setDraft(null);
      toast({ title: "Acompanhamento salvo", description: "A lista de cadastros foi atualizada." });
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[100dvh] bg-[#f7f6f2] text-[#29253a]">
        <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-6 sm:px-7 lg:px-10 lg:pt-9">
          <div className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-3 text-xs font-medium text-stone-500">
            <Link data-testid="link-back-admin" href="/admin" className="inline-flex items-center gap-1.5 transition-colors hover:text-violet-800"><ArrowLeft className="h-3.5 w-3.5" /> Master Admin</Link>
            <ChevronRight className="h-3.5 w-3.5 text-stone-300" />
            <span className="text-violet-800">Contatos e cadastros</span>
            <Link data-testid="link-trial-lab" href="/admin/trial-lab" className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-violet-800 transition-colors hover:bg-violet-100"><Beaker className="h-3.5 w-3.5" /> Laboratório de Trial <ArrowRight className="h-3 w-3" /></Link>
          </div>

          <header className="relative overflow-hidden rounded-[26px] bg-[#282038] px-6 py-8 text-[#f8f4eb] shadow-[0_22px_55px_-35px_rgba(37,23,66,0.65)] sm:px-9 sm:py-10 lg:px-12">
            <div className="pointer-events-none absolute -right-20 -top-36 h-80 w-80 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-4 -top-20 h-80 w-80 rounded-full border border-white/10" />
            <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#bda8da]/30 bg-[#bda8da]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#dac8f2]"><span className="h-1.5 w-1.5 rounded-full bg-[#ceb4ef]" /> Mirage Hub · operação comercial</div>
                <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-[45px] lg:leading-[1.1]">Pessoas por trás<br className="hidden sm:block" /> de cada assinatura<span className="text-[#c3a6e5]">.</span></h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#c6bed0]">Uma fila única para acompanhar quem chegou, quem precisa de retorno e quem já caminha com a Mirage.</p>
              </div>
              <Button data-testid="button-refresh-cadastros" onClick={() => void load()} disabled={loading || saving} variant="outline" className="w-fit shrink-0 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><RefreshCw className="mr-2 h-4 w-4" /> Atualizar lista</Button>
            </div>
          </header>

          <section aria-label="Resumo da operação" className="relative z-10 mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
            {[
              { label: "Cadastros", value: visiblePool.length, detail: "na visão atual", accent: "text-violet-700" },
              { label: "Pedem atenção", value: attention, detail: "retornos para hoje ou antes", accent: "text-rose-700" },
              { label: "Ainda novos", value: newCount, detail: "sem andamento registrado", accent: "text-amber-800" },
              { label: "Assinantes", value: activeCount, detail: "com acesso ativo", accent: "text-emerald-800" },
            ].map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-[#e9e4e9] bg-[#fffdf9] p-4 shadow-[0_4px_18px_-14px_rgba(43,32,57,0.4)] sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-stone-500">{metric.label}</p>
                <div data-testid={`metric-${metric.label.toLowerCase().replaceAll(" ", "-")}`} className={`mt-3 text-3xl font-semibold tracking-tight ${metric.accent}`}>{loading ? <Skeleton className="h-9 w-12" /> : metric.value}</div>
                <p className="mt-1 text-[11px] text-stone-500">{metric.detail}</p>
              </div>
            ))}
          </section>

          <section className="mt-9" aria-label="Fila de contatos">
            <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">Acompanhamento</p>
                <h2 className="text-2xl font-semibold tracking-[-0.035em]">Fila de contatos</h2>
              </div>
              <p className="text-xs text-stone-500">Status de assinatura são informativos. Edite apenas o acompanhamento.</p>
            </div>

            <div className="overflow-hidden rounded-[22px] border border-[#e7e1e8] bg-[#fffdf9] shadow-[0_12px_40px_-32px_rgba(43,32,57,0.45)]">
              <div className="border-b border-[#eee9ed] px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative w-full lg:max-w-sm">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <Input data-testid="input-search-cadastros" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa, pessoa ou e-mail" aria-label="Buscar empresa, pessoa ou e-mail" className="h-10 rounded-xl border-stone-200 bg-[#faf9f6] pl-10 pr-10 focus-visible:ring-violet-300" />
                    {query && <button data-testid="button-clear-search" type="button" onClick={() => setQuery("")} aria-label="Limpar busca" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"><X className="h-4 w-4" /></button>}
                  </div>
                  <label className="inline-flex cursor-pointer select-none items-center gap-2.5 self-start text-xs font-medium text-stone-600">
                    <input data-testid="checkbox-include-tests" type="checkbox" checked={includeTests} onChange={(event) => setIncludeTests(event.target.checked)} className="h-4 w-4 accent-violet-700" />
                    Incluir testes e laboratório
                  </label>
                </div>
                <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]" role="group" aria-label="Filtrar por categoria">
                  <SlidersHorizontal className="mr-1 h-4 w-4 shrink-0 text-stone-400" />
                  {categories.map(({ key, label }) => {
                    const count = visiblePool.filter((item) => key === "all" || item.status_operacional === key).length;
                    return <button data-testid={`filter-${key}`} type="button" key={key} onClick={() => changeCategory(key)} aria-pressed={category === key} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${category === key ? "bg-[#3b2a52] text-white" : "bg-[#f3f0f2] text-stone-600 hover:bg-[#e9e1ee] hover:text-violet-900"}`}>{label}<span className={`ml-2 tabular-nums ${category === key ? "text-[#d8c7e9]" : "text-stone-400"}`}>{count}</span></button>;
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-b border-[#eee9ed] px-4 py-3 text-xs text-stone-500 sm:px-6">
                <span data-testid="text-results-count">{loading ? "Carregando cadastros" : `${filtered.length} ${filtered.length === 1 ? "cadastro encontrado" : "cadastros encontrados"}`}</span>
                <span className="hidden sm:inline">Retornos vencidos aparecem primeiro</span>
              </div>

              {error && <div role="alert" data-testid="status-load-error" className="mx-4 mt-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 sm:mx-6 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-start gap-2"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> Não foi possível atualizar os cadastros. {error}</span><Button data-testid="button-retry-cadastros" variant="outline" size="sm" className="w-fit border-rose-200 bg-white" onClick={() => void load(true)}>Tentar novamente</Button></div>}

              {loading ? (
                <div className="space-y-0 divide-y divide-[#eee9ed]">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="flex items-center gap-4 px-5 py-6 sm:px-7"><Skeleton className="h-11 w-11 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-44" /><Skeleton className="h-3 w-64 max-w-full" /></div><Skeleton className="hidden h-7 w-24 rounded-full sm:block" /></div>)}</div>
              ) : filtered.length === 0 ? (
                <div data-testid="status-empty-cadastros" className="flex flex-col items-center px-6 py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">{query || category !== "all" ? <Search className="h-6 w-6" /> : <Users className="h-6 w-6" />}</div>
                  <h3 className="text-lg font-semibold">{items.length === 0 ? "Nenhum cadastro por enquanto" : "Nenhum contato nesta seleção"}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500">{items.length === 0 ? "Quando chegarem novos cadastros, eles aparecerão aqui para acompanhamento." : "Experimente outra categoria, limpe a busca ou inclua os registros de teste."}</p>
                  {(query || category !== "all" || (!includeTests && items.length > 0)) && <Button data-testid="button-clear-filters" variant="outline" className="mt-5 border-violet-200 text-violet-800" onClick={() => { setQuery(""); changeCategory("all"); setIncludeTests(true); }}>Mostrar todos</Button>}
                </div>
              ) : (
                <div className="divide-y divide-[#eee9ed]">
                  {filtered.map((item) => {
                    const needsAttention = due(item.next_action_at) && item.contact_status !== "concluido";
                    const links = publicLinks(item);
                    return (
                      <article data-testid={`card-cadastro-${item.id}`} key={item.id} className="group px-4 py-5 transition-colors hover:bg-[#faf8fb] sm:px-6">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-7">
                          <div className="flex min-w-0 flex-1 items-start gap-3.5">
                            <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eee8f4] text-sm font-bold text-violet-800">{(item.company_name || "?").trim().slice(0, 2).toUpperCase()}</div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 data-testid={`text-company-${item.id}`} className="truncate text-sm font-semibold text-[#29253a] sm:text-base">{item.company_name || "Empresa não informada"}</h3>
                                {item.is_trial_lab && <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-800">LAB</span>}
                                {item.is_test && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">TESTE</span>}
                              </div>
                              <p className="mt-1 truncate text-xs text-stone-600">{item.contact_name || "Responsável não informado"} <span className="mx-1 text-stone-300">/</span> {item.email || "E-mail não informado"}</p>
                              <p className="mt-1.5 text-[11px] text-stone-400">Origem: {item.source?.trim() || "Desconhecida"} <span className="mx-1.5">·</span> Cadastro: {formattedDate(item.created_at)}</p>
                              {!item.is_test && !item.is_trial_lab && (!links.email || !links.whatsapp) && <p className="mt-1.5 text-[11px] font-medium text-amber-800">{[!links.email && "E-mail ausente ou inválido", !links.whatsapp && "WhatsApp ausente ou inválido"].filter(Boolean).join(" · ")}</p>}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 xl:w-[270px] xl:shrink-0">
                            <span data-testid={`status-operational-${item.id}`} className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${pillForOperational(item.status_operacional)}`}>{operationalLabel(item.status_operacional)}</span>
                            <span className="inline-flex items-center rounded-full bg-[#f1edf3] px-2.5 py-1 text-[11px] font-medium text-[#665777]">{contactLabel(item.contact_status)}</span>
                          </div>
                          <div className={`flex items-center gap-2 text-xs xl:w-[170px] xl:shrink-0 ${needsAttention ? "font-semibold text-rose-700" : "text-stone-500"}`}><CalendarClock className="h-4 w-4 shrink-0" /><span data-testid={`text-followup-${item.id}`}>{followupDate(item.next_action_at)}{needsAttention ? " · atenção" : ""}</span></div>
                          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                            {links.email && <a data-testid={`link-email-${item.id}`} href={links.email} aria-label={`Enviar e-mail para ${item.company_name}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-violet-300 hover:text-violet-800"><Mail className="h-4 w-4" /></a>}
                            {links.whatsapp && <a data-testid={`link-whatsapp-${item.id}`} href={links.whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`Abrir WhatsApp de ${item.company_name}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-violet-300 hover:text-violet-800"><MessageCircle className="h-4 w-4" /></a>}
                            <Button data-testid={`button-open-cadastro-${item.id}`} variant="outline" size="sm" onClick={() => openDetail(item)} className="h-9 border-violet-200 bg-white text-violet-800 hover:bg-violet-50">Abrir ficha <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="mt-3 text-right text-[11px] text-stone-500">Contatos de teste e laboratório ficam ocultos por padrão. Nenhuma ação nesta tela altera a cobrança.</p>
          </section>
        </div>
      </div>

      <Dialog open={Boolean(selected && draft)} onOpenChange={(open) => { if (!open && !saving) { setSelectedId(null); setDraft(null); setSaveError(""); } }}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto border-[#e7e1e8] bg-[#fffdf9] p-0 text-[#29253a] sm:rounded-[22px]">
          {selected && draft && (
            <>
              <DialogHeader className="border-b border-[#eee9ed] bg-[#f7f3f9] px-5 py-5 text-left sm:px-7">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700"><ClipboardList className="h-3.5 w-3.5" /> Ficha de acompanhamento</div>
                <DialogTitle className="pr-8 text-2xl tracking-tight">{selected.company_name || "Empresa não informada"}</DialogTitle>
                <DialogDescription className="text-stone-600">Informações do cadastro e próximos passos comerciais. Assinatura e plano são somente leitura.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 px-5 py-6 sm:px-7">
                <div className="grid gap-x-6 gap-y-4 rounded-xl border border-[#ece7e8] bg-[#faf9f6] p-4 text-sm sm:grid-cols-2">
                  {[
                    ["Responsável", selected.contact_name || "Não informado"],
                    ["E-mail", selected.email || "Não informado"],
                    ["WhatsApp", selected.whatsapp || "Não informado"],
                    ["Origem", selected.source?.trim() || "Desconhecida"],
                    ["Cadastro", formattedDate(selected.created_at, true)],
                    ["Plano", selected.plan || "Não informado"],
                    ["Situação operacional", operationalLabel(selected.status_operacional)],
                    ...(selected.activation_issue ? [["Pendência de ativação", selected.activation_issue]] : []),
                    ["Assinatura", selected.assinatura_status || "Não informada"],
                    ["Expiração da assinatura", formattedDate(selected.assinatura_expira_em)],
                  ].map(([label, value]) => <div key={label} className="min-w-0"><p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-stone-500">{label}</p><p className="break-words font-medium">{value}</p></div>)}
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-stone-600">Ações de contato</p>
                  <ContactActions item={selected} />
                </div>
                <div className="border-t border-[#eee9ed] pt-5">
                  <h3 className="text-sm font-semibold">Próximo passo</h3>
                  <p className="mb-4 mt-1 text-xs text-stone-500">Salve o andamento, suas anotações e a data de retorno juntos.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cadastro-contact-status">Status do contato</Label>
                      <Select value={draft.contact_status} onValueChange={(value) => setDraft((current) => current ? { ...current, contact_status: value as ContactStatus } : current)}>
                        <SelectTrigger data-testid="select-contact-status" id="cadastro-contact-status" className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>{contactStatuses.map(({ key, label }) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cadastro-next-action">Data do próximo contato</Label>
                      <Input data-testid="input-next-action" id="cadastro-next-action" type="date" value={draft.next_action_at} onChange={(event) => setDraft((current) => current ? { ...current, next_action_at: event.target.value } : current)} className="bg-white" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="cadastro-notes">Notas de acompanhamento</Label>
                    <Textarea data-testid="textarea-contact-notes" id="cadastro-notes" maxLength={2000} value={draft.notes} onChange={(event) => setDraft((current) => current ? { ...current, notes: event.target.value } : current)} placeholder="O que foi combinado? O que precisa acontecer em seguida?" rows={4} className="resize-y bg-white" />
                  </div>
                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[#ece7e8] bg-[#faf9f6] p-3.5">
                    <input data-testid="checkbox-mark-test" type="checkbox" checked={draft.is_test} onChange={(event) => setDraft((current) => current ? { ...current, is_test: event.target.checked } : current)} className="mt-0.5 h-4 w-4 accent-violet-700" />
                    <span><span className="block text-sm font-semibold">Marcar como teste</span><span className="mt-0.5 block text-xs leading-relaxed text-stone-500">Registros de teste ficam fora da fila principal e não exibem atalhos para contato externo.</span></span>
                  </label>
                </div>
                {saveError && <p data-testid="status-save-error" role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{saveError}</p>}
              </div>
              <DialogFooter className="gap-2 border-t border-[#eee9ed] px-5 py-4 sm:px-7">
                <Button data-testid="button-cancel-edit" variant="outline" disabled={saving} onClick={() => { setSelectedId(null); setDraft(null); }}>Cancelar</Button>
                <Button data-testid="button-save-cadastro" disabled={saving} onClick={() => void save()} className="bg-[#493262] text-white hover:bg-[#342447]">{saving ? "Salvando…" : <><Check className="mr-2 h-4 w-4" /> Salvar acompanhamento</>}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}