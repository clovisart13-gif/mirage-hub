import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import KanbanLayout from '@/components/kanban/KanbanLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Globe, Users, MessageSquare, Bot, Briefcase, Megaphone,
  FileText, ArrowRight, UserPlus, Search, RefreshCw, Mail,
  Phone, Instagram, Building2, MapPin, ChevronRight, Send,
  CheckCircle, XCircle, Clock, AlertCircle, Star, Copy, Check,
  ExternalLink, MessageCircle, Filter, Loader2,
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

// ── Comunidade modules ─────────────────────────────────────────────────────────

const MODULOS = [
  {
    icon: Users,
    title: 'Fornecedores',
    desc: 'Diretório verificado de facções, tecidos, aviamentos, estamparia e serviços com avaliações reais.',
    href: '/hub/comunidade/fornecedores',
    status: 'ativo' as const,
    color: 'violet',
    colorHex: '#7C3AED',
    badge: 'Verificados R2PB',
  },
  {
    icon: MessageSquare,
    title: 'Fórum',
    desc: 'Troque experiências, tire dúvidas e compartilhe conhecimento com confeccionistas do Brasil.',
    href: '/hub/comunidade/forum',
    status: 'ativo' as const,
    color: 'blue',
    colorHex: '#2563EB',
    badge: null,
  },
  {
    icon: Bot,
    title: 'Ajuda com IA',
    desc: 'Tire dúvidas sobre gestão, precificação, tecidos e mais com nossa IA especializada em confecção.',
    href: '/hub/comunidade/ia',
    status: 'ativo' as const,
    color: 'emerald',
    colorHex: '#059669',
    badge: 'Powered by AI',
  },
  {
    icon: MessageSquare,
    title: 'Chat',
    desc: 'Converse diretamente com fornecedores e outros membros da Moda Conecta.',
    href: '/hub/comunidade/chat',
    status: 'ativo' as const,
    color: 'cyan',
    colorHex: '#0891B2',
    badge: null,
  },
  {
    icon: Briefcase,
    title: 'Vagas',
    desc: 'Encontre ou anuncie vagas no setor — costureiras, modelistas, bordadeiras, gestores e mais.',
    href: '/hub/comunidade/vagas',
    status: 'ativo' as const,
    color: 'rose',
    colorHex: '#E11D48',
    badge: null,
  },
  {
    icon: Megaphone,
    title: 'Anúncios',
    desc: 'Veja e publique anúncios de máquinas, tecidos, sobras de estoque e oportunidades do setor.',
    href: '/hub/comunidade/anuncios',
    status: 'ativo' as const,
    color: 'amber',
    colorHex: '#D97706',
    badge: null,
  },
  {
    icon: FileText,
    title: 'Currículos',
    desc: 'Cadastre seu currículo ou encontre profissionais qualificados para sua confecção.',
    href: '/hub/comunidade/curriculos',
    status: 'ativo' as const,
    color: 'indigo',
    colorHex: '#4F46E5',
    badge: null,
  },
  {
    icon: Globe,
    title: 'Feed',
    desc: 'Compartilhe novidades, projetos, conquistas e atualizações com toda a rede.',
    href: '/hub/comunidade/feed',
    status: 'breve' as const,
    color: 'slate',
    colorHex: '#64748B',
    badge: null,
  },
];

const COLOR_MAP: Record<string, string> = {
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  blue:   'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  emerald:'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  cyan:   'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
  amber:  'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  rose:   'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  slate:  'bg-slate-100 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400',
};

// ── Pipeline types & config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  novo:            { label: "Novo",            color: "bg-blue-100 text-blue-700 border-blue-200",       icon: Star },
  em_revisao:      { label: "Em Revisão",      color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  incompleto:      { label: "Incompleto",      color: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertCircle },
  aprovado:        { label: "Aprovado",        color: "bg-green-100 text-green-700 border-green-200",    icon: CheckCircle },
  rejeitado:       { label: "Rejeitado",       color: "bg-red-100 text-red-700 border-red-200",          icon: XCircle },
  convite_enviado: { label: "Convite Enviado", color: "bg-purple-100 text-purple-700 border-purple-200", icon: Send },
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
  campaignSource: string | null;
}

interface Stats {
  total: number; novo: number; em_revisao: number; incompleto: number;
  aprovado: number; rejeitado: number; convite_enviado: number;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-600 border-gray-200", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

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

const WA_ACTIONS: Array<{
  id: string; label: string; cls: string;
  getText: (l: Lead) => string;
  visible?: (l: Lead) => boolean;
}> = [
  {
    id: "aprovacao", label: "✅ Aprovação",
    cls: "border-green-300 text-green-700 hover:bg-green-50 text-xs",
    getText: (l) => `Olá, ${firstName(l)}! Seu pré-cadastro no Moda Conecta foi analisado e aprovado para a fase fundadora. Em breve enviaremos os próximos passos. 🎉`,
  },
  {
    id: "mais_info", label: "📋 Mais informações",
    cls: "border-yellow-300 text-yellow-700 hover:bg-yellow-50 text-xs",
    getText: (l) => `Olá, ${firstName(l)}! Recebemos seu pré-cadastro no Moda Conecta. Seu perfil parece aderente, mas precisamos de mais algumas informações para concluir a análise. Pode nos responder?`,
  },
  {
    id: "nao_aprovado", label: "❌ Não aprovação",
    cls: "border-red-300 text-red-700 hover:bg-red-50 text-xs",
    getText: (l) => `Olá, ${firstName(l)}! Obrigado pelo interesse no Moda Conecta. Neste momento, seu cadastro não seguirá para a fase fundadora, pois estamos formando a base inicial com foco em perfis mais aderentes à proposta atual. Obrigado pela compreensão!`,
  },
  {
    id: "convite", label: "🔗 Enviar convite",
    cls: "border-purple-300 text-purple-700 hover:bg-purple-50 text-xs",
    getText: (l) => `Olá, ${firstName(l)}! Seu perfil foi aprovado para a fase fundadora do Moda Conecta. Segue seu link de acesso: ${getInviteLink(l)}`,
    visible: (l) => Boolean(l.inviteToken),
  },
];

const EMAIL_ACTIONS: Array<{
  id: string; label: string; cls: string;
  subject: string;
  getText: (l: Lead) => string;
  visible?: (l: Lead) => boolean;
}> = [
  {
    id: "aprovacao", label: "✅ Aprovação",
    cls: "border-green-300 text-green-700 hover:bg-green-50 text-xs",
    subject: "Moda Conecta — Aprovação para a Fase Fundadora",
    getText: (l) => `Olá, ${firstName(l)}!\n\nSeu pré-cadastro no Moda Conecta foi analisado e aprovado para a fase fundadora.\n\nEm breve entraremos em contato com os próximos passos.\n\nEquipe Mirage Hub`,
  },
  {
    id: "mais_info", label: "📋 Mais informações",
    cls: "border-yellow-300 text-yellow-700 hover:bg-yellow-50 text-xs",
    subject: "Moda Conecta — Complemento de cadastro",
    getText: (l) => `Olá, ${firstName(l)}!\n\nRecebemos seu pré-cadastro no Moda Conecta. Seu perfil parece aderente, mas precisamos de mais algumas informações para concluir a análise.\n\nPode nos enviar os dados respondendo este e-mail?\n\nEquipe Mirage Hub`,
  },
  {
    id: "nao_aprovado", label: "❌ Não aprovação",
    cls: "border-red-300 text-red-700 hover:bg-red-50 text-xs",
    subject: "Moda Conecta — Retorno sobre seu cadastro",
    getText: (l) => `Olá, ${firstName(l)}!\n\nObrigado pelo interesse no Moda Conecta. Neste momento, seu cadastro não seguirá para a fase fundadora, pois estamos formando a base inicial com foco em perfis mais aderentes à proposta atual.\n\nObrigado pela compreensão.\n\nEquipe Mirage Hub`,
  },
  {
    id: "convite", label: "🔗 Enviar convite",
    cls: "border-purple-300 text-purple-700 hover:bg-purple-50 text-xs",
    subject: "Moda Conecta — Seu link de acesso à Fase Fundadora",
    getText: (l) => `Olá, ${firstName(l)}!\n\nSeu perfil foi aprovado para a fase fundadora do Moda Conecta!\n\nSegue seu link de acesso:\n${getInviteLink(l)}\n\nEquipe Mirage Hub`,
    visible: (l) => Boolean(l.inviteToken),
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-gray-400 hover:text-gray-600 transition-colors"
      title="Copiar"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Pre-cadastro status config + checklist ─────────────────────────────────────

const PC_STATUS: Record<string, { label: string; color: string }> = {
  pendente:              { label: 'Pendente',          color: 'bg-amber-100 text-amber-700 border-amber-200' },
  aprovado:              { label: '✅ Aprovado',        color: 'bg-green-100 text-green-700 border-green-200' },
  reprovado:             { label: '❌ Reprovado',       color: 'bg-red-100 text-red-700 border-red-200' },
  revisao:               { label: 'Em Revisão',         color: 'bg-blue-100 text-blue-700 border-blue-200' },
  formulario_preenchido: { label: '📋 Revisão Final',  color: 'bg-violet-100 text-violet-700 border-violet-200' },
  acesso_liberado:       { label: '🔑 Acesso Liberado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

function buildChecklist(pc: any) {
  const fd = pc.formData ?? {};
  return {
    required: [
      { label: 'Nome completo',           ok: !!pc.name?.trim() },
      { label: 'Telefone / WhatsApp',     ok: !!pc.phone?.trim() },
      { label: 'Cidade e Estado',         ok: !!(pc.cidade?.trim() && pc.estado) },
      { label: 'Tipo de estabelecimento', ok: (fd.tiposOficina?.length ?? 0) > 0 },
      { label: 'Lote mínimo',             ok: !!(fd.qtdMinima || fd.minimoLote) },
    ],
    optional: [
      { label: 'Capacidade de produção',  ok: !!pc.productionCapacity },
      { label: 'Portfólio / Site',        ok: !!pc.portfolioUrl?.trim() },
      { label: 'Fotos de produção',       ok: (pc.mediaUrls?.length ?? 0) > 0 },
      { label: 'Informações adicionais',  ok: (pc.additionalInfo?.length ?? 0) > 20 },
    ],
  };
}

// ── Pipeline Tab ───────────────────────────────────────────────────────────────

function PipelineCuradoria() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [inviteResult, setInviteResult] = useState<{ link: string; email: string } | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [preCadastro, setPreCadastro] = useState<any>(null);
  const [preCadastroLoading, setPreCadastroLoading] = useState(false);

  // Short links gerados assincronamente via token de servidor
  const [formLinks, setFormLinks] = useState<{
    forn: string; waForn: string; cliente: string; waCliente: string;
  } | null>(null);
  const [formLinksLoading, setFormLinksLoading] = useState(false);

  useEffect(() => {
    if (!selected || preCadastroLoading || preCadastro) {
      setFormLinks(null);
      return;
    }
    const params: Record<string, string> = {};
    const phone = (selected as any).whatsapp ?? (selected as any).phone ?? '';
    if (selected.fullName)      params.pf_name           = selected.fullName;
    if (selected.email)         params.pf_email          = selected.email;
    if (phone)                  params.pf_phone          = phone;
    if (selected.companyName)   params.pf_marca          = selected.companyName;
    if (selected.instagram)     params.pf_instagram      = selected.instagram;
    if (selected.cep)           params.pf_cep            = selected.cep;
    if (selected.neighborhood)  params.pf_bairro         = selected.neighborhood;
    if (selected.city)          params.pf_cidade         = selected.city;
    if (selected.state)         params.pf_estado         = selected.state;
    if (selected.roleInChain)   params.pf_role           = selected.roleInChain;
    if ((selected.specialties as string[] | null)?.length)
      params.pf_especialidades = (selected.specialties as string[]).join(',');
    if (selected.mainNeed)      params.pf_busca          = selected.mainNeed;
    if (selected.mainOffer)     params.pf_oferece        = selected.mainOffer;
    if ((selected as any).website) params.pf_website     = (selected as any).website;

    setFormLinks(null);
    setFormLinksLoading(true);
    apiFetch('/comunidade/form-token', { method: 'POST', body: JSON.stringify({ params }) })
      .then((data: any) => {
        const base = `${window.location.origin}/hub/comunidade/`;
        const urlForn    = `${base}cadastro-fornecedor?t=${data.token}`;
        const urlCliente = `${base}cadastro-cliente?t=${data.token}`;
        setFormLinks({
          forn:     urlForn,
          waForn:   `Olá, ${firstName(selected)}! Para concluir sua análise no Moda Conecta, precisamos que você preencha o formulário completo de fornecedor:\n\n${urlForn}\n\nQualquer dúvida, é só falar. 😊`,
          cliente:  urlCliente,
          waCliente:`Olá, ${firstName(selected)}! Para concluir sua análise no Moda Conecta, precisamos que você preencha o formulário de quem está buscando fornecedores:\n\n${urlCliente}\n\nQualquer dúvida, é só falar. 😊`,
        });
      })
      .catch(() => {
        // Fallback: URL com params completos
        const pfStr = new URLSearchParams(params).toString();
        const base = `${window.location.origin}/hub/comunidade/`;
        const urlForn    = `${base}cadastro-fornecedor?${pfStr}`;
        const urlCliente = `${base}cadastro-cliente?${pfStr}`;
        setFormLinks({
          forn:     urlForn,
          waForn:   `Olá, ${firstName(selected)}! Para concluir sua análise no Moda Conecta, precisamos que você preencha o formulário completo de fornecedor:\n\n${urlForn}\n\nQualquer dúvida, é só falar. 😊`,
          cliente:  urlCliente,
          waCliente:`Olá, ${firstName(selected)}! Para concluir sua análise no Moda Conecta, precisamos que você preencha o formulário de quem está buscando fornecedores:\n\n${urlCliente}\n\nQualquer dúvida, é só falar. 😊`,
        });
      })
      .finally(() => setFormLinksLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, preCadastro, preCadastroLoading]);

  const statsQ = useQuery<Stats>({
    queryKey: ["mc-leads-stats"],
    queryFn: () => apiFetch("/moda-conecta/leads/stats?companySlug=mirage"),
  });

  const leadsQ = useQuery<Lead[]>({
    queryKey: ["mc-leads", filterStatus, search],
    queryFn: () => {
      const p = new URLSearchParams({ companySlug: "mirage", limit: "200" });
      if (filterStatus !== "all") p.set("status", filterStatus);
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

  const pcMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => {
      if (action === "aprovar") {
        return apiFetch(`/comunidade/admin/pre-cadastros/${id}/aprovar-sem-convite`, { method: "POST" });
      }
      return apiFetch(`/comunidade/admin/pre-cadastros/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "reprovado" }),
      });
    },
    onSuccess: (_: any, vars: any) => {
      const novoStatus = vars.action === "aprovar" ? "aprovado" : "reprovado";
      setPreCadastro((prev: any) => prev ? { ...prev, status: novoStatus } : prev);
      toast({ title: vars.action === "aprovar" ? "Formulário aprovado! ✅" : "Formulário reprovado." });
    },
    onError: () => toast({ title: "Erro ao atualizar formulário", variant: "destructive" }),
  });

  async function fetchPreCadastro(email: string) {
    setPreCadastroLoading(true);
    setPreCadastro(null);
    try {
      const pc = await apiFetch(`/comunidade/admin/pre-cadastros/by-email?email=${encodeURIComponent(email)}`);
      setPreCadastro(pc);
    } catch {
      setPreCadastro(null); // 404 = sem formulário ainda
    } finally {
      setPreCadastroLoading(false);
    }
  }

  function openLead(lead: Lead) {
    setSelected(lead);
    setEditNotes(lead.reviewNotes ?? "");
    setInviteResult(null);
    fetchPreCadastro(lead.email);
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Filter className="w-5 h-5 text-purple-600" />
            Pipeline de Curadoria
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Fase fundadora — pré-cadastros recebidos</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => { qc.invalidateQueries({ queryKey: ["mc-leads"] }); qc.invalidateQueries({ queryKey: ["mc-leads-stats"] }); }}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <a
            href="/moda-conecta/fundadores"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-purple-200 text-purple-700 text-sm hover:bg-purple-50 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Ver formulário público
          </a>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { key: "total",          label: "Total",         color: "text-foreground" },
            { key: "novo",           label: "Novos",         color: "text-blue-600" },
            { key: "em_revisao",     label: "Em Revisão",    color: "text-yellow-600" },
            { key: "incompleto",     label: "Incompleto",    color: "text-orange-600" },
            { key: "aprovado",       label: "Aprovados",     color: "text-green-600" },
            { key: "rejeitado",      label: "Rejeitados",    color: "text-red-600" },
            { key: "convite_enviado",label: "Convite Env.",  color: "text-purple-600" },
          ].map(({ key, label, color }) => (
            <div key={key} className="bg-white border rounded-xl p-3 text-center shadow-sm">
              <p className={`text-2xl font-bold ${color}`}>{(stats as any)[key] ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou empresa..."
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
        {leadsQ.isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Carregando leads...</div>
        ) : !leadsQ.data?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum lead encontrado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs text-muted-foreground font-medium">Nome / Empresa</th>
                <th className="hidden md:table-cell px-4 py-3 text-xs text-muted-foreground font-medium">Perfil</th>
                <th className="hidden sm:table-cell px-4 py-3 text-xs text-muted-foreground font-medium">Contato</th>
                <th className="px-4 py-3 text-xs text-muted-foreground font-medium">Status</th>
                <th className="hidden lg:table-cell px-4 py-3 text-xs text-muted-foreground font-medium">Data</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leadsQ.data.map(lead => (
                <tr
                  key={lead.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => openLead(lead)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{lead.fullName}</p>
                    {lead.companyName && <p className="text-xs text-muted-foreground">{lead.companyName}</p>}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">
                    {ROLES_MAP[lead.roleInChain ?? ""] ?? lead.roleInChain ?? "—"}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground">
                    <p className="text-xs">{lead.email}</p>
                    {lead.whatsapp && <p className="text-xs">{lead.whatsapp}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 text-xs text-muted-foreground">
                    {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
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
                  { icon: Instagram, label: "Instagram", val: selected.instagram },
                  { icon: Globe, label: "Site", val: selected.website },
                ].map(({ icon: Icon, label, val, copy }) => val ? (
                  <div key={label} className="bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2 border">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm text-foreground truncate">{val}</p>
                    </div>
                    {copy && <CopyButton text={String(val)} />}
                  </div>
                ) : null)}
              </div>

              {/* Perfil + Especialidades + O que busca/oferece */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground mb-1">Perfil na cadeia</p>
                  <p className="text-sm text-foreground">{ROLES_MAP[selected.roleInChain ?? ""] ?? selected.roleInChain ?? "—"}</p>
                </div>
                {selected.campaignSource && (
                  <div className="bg-gray-50 rounded-lg p-3 border">
                    <p className="text-xs text-muted-foreground mb-1">Campanha</p>
                    <p className="text-sm text-foreground">{selected.campaignSource}</p>
                  </div>
                )}
              </div>

              {selected.specialties && (selected.specialties as string[]).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Especialidades</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(selected.specialties as string[]).map(s => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selected.mainNeed && (
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground mb-1">O que busca no Moda Conecta</p>
                  <p className="text-sm text-foreground leading-relaxed">{selected.mainNeed}</p>
                </div>
              )}
              {selected.mainOffer && (
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <p className="text-xs text-muted-foreground mb-1">O que oferece para a rede</p>
                  <p className="text-sm text-foreground leading-relaxed">{selected.mainOffer}</p>
                </div>
              )}

              {/* ── FORMULÁRIO COMPLETO — CHECKLIST ── */}
              <div className="rounded-xl border overflow-hidden">
                <div className="bg-violet-50 border-b px-4 py-2.5 flex items-center justify-between">
                  <p className="text-sm font-semibold text-violet-800">Formulário Completo</p>
                  {preCadastroLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />}
                  {!preCadastroLoading && preCadastro && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PC_STATUS[preCadastro.status]?.color ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      {PC_STATUS[preCadastro.status]?.label ?? preCadastro.status}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  {preCadastroLoading ? (
                    <p className="text-xs text-muted-foreground">Verificando formulário...</p>
                  ) : !preCadastro ? (() => {
                    const waPhone = (selected as any)?.whatsapp ?? (selected as any)?.phone ?? "";
                    return formLinksLoading ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" /> Gerando link…
                      </p>
                    ) : formLinks ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-amber-800">Formulário detalhado não preenchido</p>
                            <p className="text-xs text-amber-700 mt-0.5">Escolha o formulário certo conforme o perfil do lead e envie pelo WhatsApp.</p>
                          </div>
                        </div>

                        {/* Card Fornecedor */}
                        <div className="border rounded-xl p-3 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">🏭</span>
                            <p className="text-xs font-semibold text-foreground">Oferece serviço / produto</p>
                            <span className="text-xs text-muted-foreground">(facção, oficina, fornecedor…)</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-gray-50 border rounded-lg">
                            <span className="text-xs text-gray-500 font-mono truncate flex-1">…/cadastro-fornecedor?t=…</span>
                            <CopyButton text={formLinks.forn} />
                          </div>
                          {waPhone && (
                            <a href={buildWaUrl(waPhone, formLinks.waForn)} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-300 bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors w-full justify-center">
                              <MessageCircle className="w-3.5 h-3.5" /> Enviar via WhatsApp
                            </a>
                          )}
                        </div>

                        {/* Card Cliente */}
                        <div className="border rounded-xl p-3 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">🛍️</span>
                            <p className="text-xs font-semibold text-foreground">Procura serviço / produto</p>
                            <span className="text-xs text-muted-foreground">(marca, lojista, confecção…)</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-gray-50 border rounded-lg">
                            <span className="text-xs text-gray-500 font-mono truncate flex-1">…/cadastro-cliente?t=…</span>
                            <CopyButton text={formLinks.cliente} />
                          </div>
                          {waPhone && (
                            <a href={buildWaUrl(waPhone, formLinks.waCliente)} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-300 bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors w-full justify-center">
                              <MessageCircle className="w-3.5 h-3.5" /> Enviar via WhatsApp
                            </a>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground italic border-t pt-2">
                          💡 Você pode aprovar o lead mesmo sem o formulário completo — as duas ações são independentes.
                        </p>
                      </div>
                    ) : null;
                  })() : (() => {
                    const { required, optional } = buildChecklist(preCadastro);
                    const reqOk = required.filter(r => r.ok).length;
                    const allReqOk = reqOk === required.length;
                    return (
                      <div className="space-y-4">
                        {/* Progress bar */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Campos obrigatórios</span>
                            <span className={allReqOk ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                              {reqOk}/{required.length}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${allReqOk ? 'bg-green-500' : 'bg-amber-400'}`}
                              style={{ width: `${(reqOk / required.length) * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Obrigatórios */}
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Obrigatórios</p>
                          {required.map(item => (
                            <div key={item.label} className="flex items-center gap-2">
                              {item.ok
                                ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                              <span className={`text-xs ${item.ok ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
                            </div>
                          ))}
                        </div>

                        {/* Opcionais */}
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Complementares</p>
                          {optional.map(item => (
                            <div key={item.label} className="flex items-center gap-2">
                              {item.ok
                                ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                : <AlertCircle className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                              <span className={`text-xs ${item.ok ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
                            </div>
                          ))}
                        </div>

                        {/* Ações sobre o formulário */}
                        {preCadastro.status !== 'aprovado' && preCadastro.status !== 'acesso_liberado' ? (
                          <div className="flex flex-wrap gap-2 pt-1 border-t">
                            <Button
                              size="sm"
                              disabled={pcMut.isPending}
                              onClick={() => pcMut.mutate({ id: preCadastro.id, action: 'aprovar' })}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                            >
                              {pcMut.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                              Aprovar formulário
                            </Button>
                            {preCadastro.status !== 'reprovado' && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={pcMut.isPending}
                                onClick={() => pcMut.mutate({ id: preCadastro.id, action: 'reprovar' })}
                                className="border-red-300 text-red-600 hover:bg-red-50 text-xs h-7"
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Reprovar formulário
                              </Button>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-green-600 font-medium pt-1 border-t">✅ Formulário aprovado internamente</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Notas de revisão */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Notas internas</p>
                <Textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Adicione observações sobre este lead..."
                  rows={3}
                  className="resize-none text-sm"
                />
                <Button
                  size="sm" variant="outline"
                  onClick={saveNotes}
                  disabled={updateMut.isPending}
                >
                  Salvar notas
                </Button>
              </div>

              {/* Status do LEAD */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Status do lead</p>
                <div className="flex flex-wrap gap-2">
                  {selected.status !== "em_revisao" && (
                    <Button size="sm" onClick={() => changeStatus("em_revisao")}
                      disabled={updateMut.isPending}
                      className="bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 text-yellow-700 text-xs shadow-none">
                      Em Revisão
                    </Button>
                  )}
                  {selected.status !== "incompleto" && (
                    <Button size="sm" onClick={() => changeStatus("incompleto")}
                      disabled={updateMut.isPending}
                      className="bg-orange-100 hover:bg-orange-200 border border-orange-300 text-orange-700 text-xs shadow-none">
                      Incompleto
                    </Button>
                  )}
                  {selected.status !== "aprovado" && (
                    <Button size="sm" onClick={() => changeStatus("aprovado")}
                      disabled={updateMut.isPending}
                      className="bg-green-100 hover:bg-green-200 border border-green-300 text-green-700 text-xs shadow-none">
                      Aprovar lead
                    </Button>
                  )}
                  {selected.status !== "rejeitado" && (
                    <Button size="sm" onClick={() => changeStatus("rejeitado")}
                      disabled={updateMut.isPending}
                      className="bg-red-100 hover:bg-red-200 border border-red-300 text-red-700 text-xs shadow-none">
                      Rejeitar lead
                    </Button>
                  )}
                </div>
              </div>

              {/* Gerar convite */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Convite de acesso ao Hub</p>
                {selected.inviteToken ? (
                  <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <span className="text-xs text-purple-700 font-mono truncate flex-1">{getInviteLink(selected)}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(getInviteLink(selected)); setCopiedInvite(true); setTimeout(() => setCopiedInvite(false), 1500); }}
                      className="text-purple-600 hover:text-purple-800 transition-colors shrink-0"
                    >
                      {copiedInvite ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <Button size="sm"
                    onClick={() => inviteMut.mutate(selected.id)}
                    disabled={inviteMut.isPending || selected.status !== "aprovado"}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                  >
                    {inviteMut.isPending ? "Gerando..." : "Gerar link de convite"}
                  </Button>
                )}
                {inviteResult && (
                  <p className="text-xs text-green-600">Convite gerado!</p>
                )}
              </div>

              {/* WhatsApp actions */}
              {(selected.whatsapp || selected.phone) && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-green-600" /> WhatsApp
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {WA_ACTIONS.filter(a => !a.visible || a.visible(selected)).map(action => (
                      <a key={action.id}
                        href={buildWaUrl(selected.whatsapp ?? selected.phone ?? "", action.getText(selected))}
                        target="_blank" rel="noopener noreferrer"
                        className={cn("inline-flex items-center gap-1 px-3 py-1.5 rounded-md border font-medium transition-colors", action.cls)}
                      >
                        {action.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Email actions */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" /> E-mail
                </p>
                <div className="flex flex-wrap gap-2">
                  {EMAIL_ACTIONS.filter(a => !a.visible || a.visible(selected)).map(action => (
                    <a key={action.id}
                      href={buildMailtoUrl(selected.email, action.subject, action.getText(selected))}
                      className={cn("inline-flex items-center gap-1 px-3 py-1.5 rounded-md border font-medium transition-colors", action.cls)}
                    >
                      {action.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ComunidadeApp() {
  const { user } = useAuth();
  const isSuperAdmin = user?.email === "clovisart13@gmail.com";
  const [tab, setTab] = useState<"visao-geral" | "pipeline">("visao-geral");

  return (
    <KanbanLayout>
      <div className="w-full overflow-auto">

        {/* Tabs */}
        <div className="border-b bg-background px-6 pt-4">
          <div className="flex gap-1">
            <button
              onClick={() => setTab("visao-geral")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors",
                tab === "visao-geral"
                  ? "border-emerald-600 text-emerald-700 bg-emerald-50/60"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Visão Geral
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => setTab("pipeline")}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors flex items-center gap-1.5",
                  tab === "pipeline"
                    ? "border-purple-600 text-purple-700 bg-purple-50/60"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                Pipeline de Curadoria
              </button>
            )}
          </div>
        </div>

        {/* Tab content */}
        {tab === "visao-geral" ? (
          <div className="px-6 py-8 space-y-8">

            {/* Hero */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
              />
              <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                      <Globe size={24} />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold">Moda Conecta</h1>
                      <p className="text-emerald-100 text-sm">A maior rede B2B do vestuário brasileiro</p>
                    </div>
                  </div>
                  <p className="text-emerald-50 leading-relaxed max-w-lg">
                    Conecte sua confecção a fornecedores verificados, outros confeccionistas, profissionais e especialistas do setor têxtil.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Fornecedores', 'Fórum', 'Vagas', 'Anúncios', 'Chat', 'Currículos', 'IA'].map(tag => (
                      <span key={tag} className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                  <Link href="/hub/comunidade/cadastro-fornecedor">
                    <Button className="bg-white text-emerald-700 hover:bg-emerald-50 w-full">
                      <UserPlus className="w-4 h-4 mr-2" /> Sou Fornecedor
                    </Button>
                  </Link>
                  <Link href="/hub/comunidade/cadastro-cliente">
                    <Button variant="outline" className="border-white/40 text-white hover:bg-white/10 w-full">
                      <Search className="w-4 h-4 mr-2" /> Sou Confeccionista
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Módulos */}
            <div>
              <h2 className="font-bold text-lg mb-1">Módulos da Comunidade</h2>
              <p className="text-sm text-muted-foreground mb-5">Selecione um módulo para acessar</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {MODULOS.map(m => {
                  const isAtivo = m.status === 'ativo';
                  const card = (
                    <div className={`group relative flex flex-col gap-3 p-5 rounded-2xl border bg-card transition-all
                      ${isAtivo ? 'hover:shadow-md hover:border-primary/30 cursor-pointer' : 'opacity-60 cursor-default'}`}>
                      <div className="flex items-start justify-between">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${COLOR_MAP[m.color]}`}>
                          <m.icon size={18} />
                        </div>
                        {!isAtivo && (
                          <Badge variant="outline" className="text-xs shrink-0">Em breve</Badge>
                        )}
                        {m.badge && isAtivo && (
                          <Badge className="text-xs shrink-0 bg-violet-100 text-violet-700 border-0">{m.badge}</Badge>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm flex items-center gap-1.5">
                          {m.title}
                          {isAtivo && <ArrowRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.desc}</p>
                      </div>
                    </div>
                  );

                  return isAtivo ? (
                    <Link key={m.title} href={m.href} className="block">{card}</Link>
                  ) : (
                    <div key={m.title}>{card}</div>
                  );
                })}
              </div>
            </div>

            {/* CTAs inferiores */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50 dark:bg-violet-950/20 p-6 flex flex-col gap-3">
                <div>
                  <p className="font-bold text-violet-700 dark:text-violet-300">Você é fornecedor?</p>
                  <p className="text-sm text-muted-foreground mt-1">Cadastre-se e seja encontrado por confeccionistas que precisam dos seus serviços.</p>
                </div>
                <Link href="/hub/comunidade/cadastro-fornecedor">
                  <Button className="bg-violet-600 hover:bg-violet-700 w-full sm:w-auto">
                    <UserPlus className="w-4 h-4 mr-2" /> Cadastrar meu negócio
                  </Button>
                </Link>
              </div>
              <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-6 flex flex-col gap-3">
                <div>
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">Procurando fornecedor?</p>
                  <p className="text-sm text-muted-foreground mt-1">Acesse o diretório verificado e filtre por especialidade, localização e capacidade.</p>
                </div>
                <Link href="/hub/comunidade/fornecedores">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
                    <Search className="w-4 h-4 mr-2" /> Ver fornecedores
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-6">
            <PipelineCuradoria />
          </div>
        )}
      </div>
    </KanbanLayout>
  );
}
