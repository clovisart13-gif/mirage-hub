import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Users, Search, RefreshCw, Mail, Phone, Globe,
  Instagram, Building2, MapPin, ChevronRight, Send,
  CheckCircle, XCircle, Clock, AlertCircle, Star,
  Copy, Check, ExternalLink, MessageCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import KanbanLayout from "@/components/kanban/KanbanLayout";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  novo:            { label: "Novo",            color: "bg-blue-500/15 text-blue-300 border-blue-500/30",     icon: Star },
  em_revisao:      { label: "Em Revisão",      color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30", icon: Clock },
  incompleto:      { label: "Incompleto",      color: "bg-orange-500/15 text-orange-300 border-orange-500/30", icon: AlertCircle },
  aprovado:        { label: "Aprovado",        color: "bg-green-500/15 text-green-300 border-green-500/30",   icon: CheckCircle },
  rejeitado:       { label: "Rejeitado",       color: "bg-red-500/15 text-red-300 border-red-500/30",         icon: XCircle },
  convite_enviado: { label: "Convite Enviado", color: "bg-purple-500/15 text-purple-300 border-purple-500/30", icon: Send },
};

const ROLES_MAP: Record<string, string> = {
  marca: "Marca / Grife", confeccao: "Confecção", private_label: "Private Label",
  faccao: "Facção", oficina: "Oficina / Ateliê", fornecedor: "Fornecedor",
  prestador: "Prestador", outro: "Outro",
};

interface Lead {
  id: string; createdAt: string; updatedAt: string;
  fullName: string; email: string; phone: string | null; whatsapp: string | null;
  companyName: string | null; city: string | null; state: string | null;
  cep: string | null; neighborhood: string | null; addressLine: string | null;
  instagram: string | null; website: string | null;
  roleInChain: string | null; specialties: string[] | null;
  mainNeed: string | null; mainOffer: string | null;
  status: string; reviewNotes: string | null; reviewedBy: string | null;
  reviewedAt: string | null; approvedAt: string | null;
  inviteToken: string | null; inviteSentAt: string | null;
  isContacted: boolean; contactedAt: string | null;
  campaignSource: string | null | undefined;
}

interface Stats {
  total: number; novo: number; em_revisao: number; incompleto: number;
  aprovado: number; rejeitado: number; convite_enviado: number;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-slate-700 text-slate-300 border-slate-600", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Helpers de contato ─────────────────────────────────────────
function buildWaUrl(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://api.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(text)}`;
}

function buildMailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function getInviteLink(lead: Lead): string {
  if (!lead.inviteToken) return "";
  return `${window.location.origin}/moda-conecta/convite?token=${lead.inviteToken}`;
}

const firstName = (lead: Lead) => lead.fullName.split(" ")[0];

// ── Templates WhatsApp ─────────────────────────────────────────
const WA_ACTIONS: Array<{
  id: string; label: string; cls: string;
  getText: (l: Lead) => string;
  visible?: (l: Lead) => boolean;
}> = [
  {
    id: "aprovacao",
    label: "✅ Aprovação",
    cls: "border-green-600/40 text-green-300 hover:bg-green-600/20 text-xs",
    getText: (l) =>
      `Olá, ${firstName(l)}! Seu pré-cadastro no Moda Conecta foi analisado e aprovado para a fase fundadora. Em breve enviaremos os próximos passos. 🎉`,
  },
  {
    id: "mais_info",
    label: "📋 Mais informações",
    cls: "border-yellow-600/40 text-yellow-300 hover:bg-yellow-600/20 text-xs",
    getText: (l) =>
      `Olá, ${firstName(l)}! Recebemos seu pré-cadastro no Moda Conecta. Seu perfil parece aderente, mas precisamos de mais algumas informações para concluir a análise. Pode nos responder?`,
  },
  {
    id: "nao_aprovado",
    label: "❌ Não aprovação",
    cls: "border-red-600/40 text-red-300 hover:bg-red-600/20 text-xs",
    getText: (l) =>
      `Olá, ${firstName(l)}! Obrigado pelo interesse no Moda Conecta. Neste momento, seu cadastro não seguirá para a fase fundadora, pois estamos formando a base inicial com foco em perfis mais aderentes à proposta atual. Obrigado pela compreensão!`,
  },
  {
    id: "convite",
    label: "🔗 Enviar convite",
    cls: "border-purple-600/40 text-purple-300 hover:bg-purple-600/20 text-xs",
    getText: (l) =>
      `Olá, ${firstName(l)}! Seu perfil foi aprovado para a fase fundadora do Moda Conecta. Segue seu link de acesso: ${getInviteLink(l)}`,
    visible: (l) => Boolean(l.inviteToken),
  },
];

// ── Templates E-mail ───────────────────────────────────────────
const EMAIL_ACTIONS: Array<{
  id: string; label: string; cls: string;
  subject: string;
  getText: (l: Lead) => string;
  visible?: (l: Lead) => boolean;
}> = [
  {
    id: "aprovacao",
    label: "✅ Aprovação",
    cls: "border-green-600/40 text-green-300 hover:bg-green-600/20 text-xs",
    subject: "Moda Conecta — Aprovação para a Fase Fundadora",
    getText: (l) =>
      `Olá, ${firstName(l)}!\n\nSeu pré-cadastro no Moda Conecta foi analisado e aprovado para a fase fundadora.\n\nEm breve entraremos em contato com os próximos passos.\n\nEquipe Mirage Hub`,
  },
  {
    id: "mais_info",
    label: "📋 Mais informações",
    cls: "border-yellow-600/40 text-yellow-300 hover:bg-yellow-600/20 text-xs",
    subject: "Moda Conecta — Complemento de cadastro",
    getText: (l) =>
      `Olá, ${firstName(l)}!\n\nRecebemos seu pré-cadastro no Moda Conecta. Seu perfil parece aderente, mas precisamos de mais algumas informações para concluir a análise.\n\nPode nos enviar os dados respondendo este e-mail?\n\nEquipe Mirage Hub`,
  },
  {
    id: "nao_aprovado",
    label: "❌ Não aprovação",
    cls: "border-red-600/40 text-red-300 hover:bg-red-600/20 text-xs",
    subject: "Moda Conecta — Retorno sobre seu cadastro",
    getText: (l) =>
      `Olá, ${firstName(l)}!\n\nObrigado pelo interesse no Moda Conecta. Neste momento, seu cadastro não seguirá para a fase fundadora, pois estamos formando a base inicial com foco em perfis mais aderentes à proposta atual.\n\nObrigado pela compreensão.\n\nEquipe Mirage Hub`,
  },
  {
    id: "convite",
    label: "🔗 Enviar convite",
    cls: "border-purple-600/40 text-purple-300 hover:bg-purple-600/20 text-xs",
    subject: "Moda Conecta — Seu link de acesso à Fase Fundadora",
    getText: (l) =>
      `Olá, ${firstName(l)}!\n\nSeu perfil foi aprovado para a fase fundadora do Moda Conecta!\n\nSegue seu link de acesso:\n${getInviteLink(l)}\n\nEquipe Mirage Hub`,
    visible: (l) => Boolean(l.inviteToken),
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-slate-500 hover:text-slate-300 transition-colors"
      title="Copiar"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function ModaConectaLeads() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [inviteResult, setInviteResult] = useState<{ link: string; email: string } | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const statsQ = useQuery<Stats>({
    queryKey: ["mc-leads-stats"],
    queryFn: () => apiFetch("/moda-conecta/leads/stats?companySlug=mirage"),
  });

  const leadsQ = useQuery<Lead[]>({
    queryKey: ["mc-leads", filterStatus, filterSource, search],
    queryFn: () => {
      const p = new URLSearchParams({ companySlug: "mirage", limit: "200" });
      if (filterStatus !== "all") p.set("status", filterStatus);
      if (filterSource !== "all") p.set("campaignSource", filterSource);
      if (search.trim()) p.set("search", search.trim());
      return apiFetch(`/moda-conecta/leads?${p}`);
    },
    staleTime: 30_000,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiFetch(`/moda-conecta/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (updated: Lead) => {
      qc.invalidateQueries({ queryKey: ["mc-leads"] });
      qc.invalidateQueries({ queryKey: ["mc-leads-stats"] });
      setSelected(updated);
      toast({ title: "Atualizado com sucesso" });
    },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  const inviteMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/moda-conecta/leads/${id}/invite`, { method: "POST" }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["mc-leads"] });
      qc.invalidateQueries({ queryKey: ["mc-leads-stats"] });
      setInviteResult({ link: data.inviteLink, email: data.email });
      if (selected) setSelected({ ...selected, status: "convite_enviado", inviteToken: data.inviteToken, inviteSentAt: data.inviteSentAt });
      toast({ title: "Convite gerado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao gerar convite", variant: "destructive" }),
  });

  function openLead(lead: Lead) {
    setSelected(lead);
    setEditNotes(lead.reviewNotes ?? "");
    setInviteResult(null);
  }

  function changeStatus(status: string) {
    if (!selected) return;
    updateMut.mutate({ id: selected.id, data: { status } });
  }

  function saveNotes() {
    if (!selected) return;
    updateMut.mutate({ id: selected.id, data: { reviewNotes: editNotes } });
  }

  const stats = statsQ.data;

  return (
    <KanbanLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Fundadores Moda Conecta
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">Pipeline de curadoria — fase fundadora</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => { qc.invalidateQueries({ queryKey: ["mc-leads"] }); qc.invalidateQueries({ queryKey: ["mc-leads-stats"] }); }}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <a
              href="/moda-conecta/fundadores"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-purple-500/30 text-purple-300 text-sm hover:bg-purple-500/10 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Ver formulário público
            </a>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { key: "total", label: "Total", color: "text-white" },
              { key: "novo", label: "Novos", color: "text-blue-400" },
              { key: "em_revisao", label: "Em Revisão", color: "text-yellow-400" },
              { key: "incompleto", label: "Incompleto", color: "text-orange-400" },
              { key: "aprovado", label: "Aprovados", color: "text-green-400" },
              { key: "rejeitado", label: "Rejeitados", color: "text-red-400" },
              { key: "convite_enviado", label: "Convite Env.", color: "text-purple-400" },
            ].map(({ key, label, color }) => (
              <div key={key} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{(stats as any)[key] ?? 0}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Source filter pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: "all",              label: "Todos" },
            { value: "r2pb_parceiros",   label: "🏭 R2PB — Parceiros" },
            { value: "r2pb_rh",          label: "👤 R2PB — RH" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterSource(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filterSource === opt.value
                  ? "bg-purple-600 text-white border-purple-500"
                  : "bg-slate-800 text-slate-400 border-slate-600 hover:border-slate-500"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail ou empresa..."
              className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-48 bg-slate-800 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="all" className="text-slate-200">Todos os status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-slate-200">{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
          {leadsQ.isLoading ? (
            <div className="text-center py-16 text-slate-400">Carregando leads...</div>
          ) : !leadsQ.data?.length ? (
            <div className="text-center py-16 text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum lead encontrado</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left">
                  <th className="px-4 py-3 text-xs text-slate-400 font-medium">Nome / Empresa</th>
                  <th className="hidden md:table-cell px-4 py-3 text-xs text-slate-400 font-medium">Perfil</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-xs text-slate-400 font-medium">Contato</th>
                  <th className="px-4 py-3 text-xs text-slate-400 font-medium">Status</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-xs text-slate-400 font-medium">Data</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {leadsQ.data.map(lead => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-700/30 cursor-pointer transition-colors"
                    onClick={() => openLead(lead)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{lead.fullName}</p>
                      {lead.companyName && <p className="text-xs text-slate-400">{lead.companyName}</p>}
                      {lead.campaignSource?.startsWith("r2pb") && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/30">
                          {lead.campaignSource === "r2pb_rh" ? "R2PB RH" : "R2PB Parceiro"}
                        </span>
                      )}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-slate-300">
                      {ROLES_MAP[lead.roleInChain ?? ""] ?? lead.roleInChain ?? "—"}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-slate-400">
                      <p className="text-xs">{lead.email}</p>
                      {lead.whatsapp && <p className="text-xs">{lead.whatsapp}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-xs text-slate-500">
                      {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Dialog */}
        {selected && (
          <Dialog open onOpenChange={() => setSelected(null)}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  {selected.fullName}
                  <StatusBadge status={selected.status} />
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                {/* Info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: Mail, label: "E-mail", val: selected.email, copy: true },
                    { icon: Phone, label: "WhatsApp", val: selected.whatsapp, copy: true },
                    { icon: Building2, label: "Empresa", val: selected.companyName },
                    { icon: MapPin, label: "Cidade / UF", val: [selected.city, selected.state].filter(Boolean).join(" / ") || null },
                    { icon: MapPin, label: "Bairro", val: selected.neighborhood },
                    { icon: MapPin, label: "Endereço", val: selected.addressLine ?? (selected.cep ? `CEP ${selected.cep}` : null) },
                    { icon: Instagram, label: "Instagram", val: selected.instagram },
                    { icon: Globe, label: "Site", val: selected.website },
                  ].map(({ icon: Icon, label, val, copy }) => val ? (
                    <div key={label} className="bg-slate-800/50 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className="text-sm text-slate-200 truncate">{val}</p>
                      </div>
                      {copy && <CopyButton text={val} />}
                    </div>
                  ) : null)}
                </div>

                {/* Perfil */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Perfil na cadeia</p>
                    <p className="text-sm text-slate-200">{ROLES_MAP[selected.roleInChain ?? ""] ?? selected.roleInChain ?? "—"}</p>
                  </div>
                  {selected.campaignSource && (
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Campanha</p>
                      <p className="text-sm text-slate-200">{selected.campaignSource}</p>
                    </div>
                  )}
                </div>

                {/* Especialidades */}
                {selected.specialties && (selected.specialties as string[]).length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Especialidades</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(selected.specialties as string[]).map(s => (
                        <Badge key={s} variant="outline" className="border-slate-600 text-slate-300 text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* O que busca / oferece */}
                {selected.mainNeed && (
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">O que busca no Moda Conecta</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{selected.mainNeed}</p>
                  </div>
                )}
                {selected.mainOffer && (
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">O que oferece para a rede</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{selected.mainOffer}</p>
                  </div>
                )}

                {/* Notas de revisão */}
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 font-medium">Notas internas</p>
                  <Textarea
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Adicione observações sobre este lead..."
                    rows={3}
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 resize-none text-sm"
                  />
                  <Button
                    size="sm" variant="outline"
                    onClick={saveNotes}
                    disabled={updateMut.isPending}
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    Salvar notas
                  </Button>
                </div>

                {/* Ações de status */}
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 font-medium">Mudar status</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.status !== "em_revisao" && (
                      <Button size="sm" onClick={() => changeStatus("em_revisao")}
                        disabled={updateMut.isPending}
                        className="bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/40 text-yellow-300 text-xs">
                        Em Revisão
                      </Button>
                    )}
                    {selected.status !== "incompleto" && (
                      <Button size="sm" onClick={() => changeStatus("incompleto")}
                        disabled={updateMut.isPending}
                        className="bg-orange-600/20 hover:bg-orange-600/30 border border-orange-600/40 text-orange-300 text-xs">
                        Incompleto
                      </Button>
                    )}
                    {selected.status !== "aprovado" && (
                      <Button size="sm" onClick={() => changeStatus("aprovado")}
                        disabled={updateMut.isPending}
                        className="bg-green-600/20 hover:bg-green-600/30 border border-green-600/40 text-green-300 text-xs">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Aprovar
                      </Button>
                    )}
                    {selected.status !== "rejeitado" && (
                      <Button size="sm" onClick={() => changeStatus("rejeitado")}
                        disabled={updateMut.isPending}
                        className="bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 text-red-300 text-xs">
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeitar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Enviar convite */}
                {(selected.status === "aprovado" || selected.status === "convite_enviado") && (
                  <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-purple-300 flex items-center gap-2">
                        <Send className="w-4 h-4" /> Convite de acesso
                      </p>
                      {selected.inviteSentAt && (
                        <span className="text-xs text-slate-500">
                          Enviado em {new Date(selected.inviteSentAt).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={() => inviteMut.mutate(selected.id)}
                      disabled={inviteMut.isPending}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-sm w-full"
                    >
                      {inviteMut.isPending ? "Gerando..." : selected.inviteToken ? "Gerar novo convite" : "Gerar convite"}
                    </Button>

                    {inviteResult && (
                      <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                        <p className="text-xs text-slate-400">Link de convite para <strong>{inviteResult.email}</strong></p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs text-purple-300 truncate bg-slate-900 px-2 py-1 rounded">{inviteResult.link}</code>
                          <button
                            onClick={() => { navigator.clipboard.writeText(inviteResult.link); setCopiedInvite(true); setTimeout(() => setCopiedInvite(false), 2000); }}
                            className="text-slate-400 hover:text-white"
                          >
                            {copiedInvite ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-slate-500">Envie este link via WhatsApp ou e-mail para o lead.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Ações de contato ─────────────────────────── */}
                <div className="space-y-3 border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-medium">Ações de contato</p>
                    {selected.isContacted && selected.contactedAt && (
                      <span className="text-xs text-slate-600">
                        Contactado em {new Date(selected.contactedAt).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>

                  {/* WhatsApp */}
                  {selected.whatsapp ? (
                    <div className="bg-slate-800/50 rounded-xl p-3 space-y-2">
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                        WhatsApp — {selected.whatsapp}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {WA_ACTIONS
                          .filter(a => !a.visible || a.visible(selected))
                          .map(action => (
                            <a
                              key={action.id}
                              href={buildWaUrl(selected.whatsapp!, action.getText(selected))}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                if (!selected.isContacted) {
                                  updateMut.mutate({ id: selected.id, data: { isContacted: true } });
                                }
                              }}
                            >
                              <Button size="sm" variant="outline" className={action.cls}>
                                {action.label}
                              </Button>
                            </a>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 italic flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 opacity-40" />
                      Sem WhatsApp — ações de WA indisponíveis
                    </p>
                  )}

                  {/* E-mail */}
                  <div className="bg-slate-800/50 rounded-xl p-3 space-y-2">
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                      E-mail — {selected.email}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {EMAIL_ACTIONS
                        .filter(a => !a.visible || a.visible(selected))
                        .map(action => (
                          <a
                            key={action.id}
                            href={buildMailtoUrl(selected.email, action.subject, action.getText(selected))}
                            onClick={() => {
                              if (!selected.isContacted) {
                                updateMut.mutate({ id: selected.id, data: { isContacted: true } });
                              }
                            }}
                          >
                            <Button size="sm" variant="outline" className={action.cls}>
                              {action.label}
                            </Button>
                          </a>
                        ))}
                    </div>
                  </div>

                  {/* Marcar como contactado manualmente */}
                  {!selected.isContacted && (
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => updateMut.mutate({ id: selected.id, data: { isContacted: true } })}
                      disabled={updateMut.isPending}
                      className="text-xs text-slate-500 hover:text-slate-300"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Marcar como contactado
                    </Button>
                  )}
                </div>

                {/* Metadados */}
                <div className="text-xs text-slate-600 space-y-0.5 pt-2 border-t border-slate-800">
                  <p>ID: {selected.id}</p>
                  <p>Cadastro: {new Date(selected.createdAt).toLocaleString("pt-BR")}</p>
                  {selected.reviewedBy && <p>Revisado por: {selected.reviewedBy} em {selected.reviewedAt ? new Date(selected.reviewedAt).toLocaleString("pt-BR") : "—"}</p>}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </KanbanLayout>
  );
}
