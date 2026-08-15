import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Activity, Users, DollarSign, AlertTriangle, CheckCircle2,
  Clock, Zap, BookOpen, PhoneCall, Heart, RefreshCw,
  Building2, Package, ChevronDown, ChevronUp, TrendingUp,
  Code2, Database, Globe, ArrowRight, Flag, Layers, Briefcase, Link2,
  MessageSquare, Bug, Lightbulb, ShieldAlert,
} from 'lucide-react';

const SUPER_ADMIN_EMAIL = 'clovisart13@gmail.com';
const PLAN_PRICES: Record<string, number> = { starter: 197, pro: 397, enterprise: 797 };

type Tab = 'saude' | 'chamadas' | 'partners' | 'guia' | 'feedback' | 'erros';

type Tenant = {
  id: string; name: string; slug: string; plan: string;
  assinatura_status: string; assinatura_expira_em: string | null; active: boolean;
};

type Chamada = {
  id: string; tenant_name: string; user_email: string; assunto: string;
  descricao: string; status: string; prioridade: string; categoria: string;
  criado_em: string; notas_admin: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  aberto: 'bg-red-100 text-red-700 border-red-200',
  em_atendimento: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  resolvido: 'bg-green-100 text-green-700 border-green-200',
  fechado: 'bg-gray-100 text-gray-600 border-gray-200',
};
const PRIO_COLOR: Record<string, string> = {
  baixa: 'bg-blue-50 text-blue-600', media: 'bg-yellow-50 text-yellow-700',
  alta: 'bg-orange-100 text-orange-700', critica: 'bg-red-100 text-red-700',
};

export default function Operacoes() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('saude');

  // Saúde
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [loadingSaude, setLoadingSaude] = useState(true);

  // Chamadas
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [loadingChamadas, setLoadingChamadas] = useState(false);
  const [chamadasError, setChamadasError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNota, setEditingNota] = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus] = useState('todos');

  // Partners
  const [partnersData, setPartnersData] = useState<{ leads: any[]; porParceiro: any[]; totalLeads: number; tenantsUnicos: number } | null>(null);
  const [loadingPartners, setLoadingPartners] = useState(false);

  // Feedback
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState('todos');

  // Erros
  const [errorList, setErrorList] = useState<any[]>([]);
  const [loadingErrors, setLoadingErrors] = useState(false);

  useEffect(() => {
    if (user?.email !== SUPER_ADMIN_EMAIL) { navigate('/hub'); return; }
    loadSaude();
  }, [user]);

  async function loadSaude() {
    setLoadingSaude(true);
    try {
      const [tenData, health] = await Promise.allSettled([
        apiFetch('/admin/tenants'),
        apiFetch('/healthz'),
      ]);
      if (tenData.status === 'fulfilled') setTenants(Array.isArray(tenData.value) ? tenData.value : (tenData.value?.tenants ?? []));
      setApiOk(health.status === 'fulfilled');
    } finally { setLoadingSaude(false); }
  }

  async function loadChamadas() {
    setLoadingChamadas(true);
    setChamadasError(null);
    try {
      const data = await apiFetch(`/suporte/chamadas?status=${filterStatus}`);
      setChamadas(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('PGRST')) {
        setChamadasError('setup');
      } else {
        setChamadasError(msg);
        toast({ title: 'Erro ao carregar chamadas', variant: 'destructive' });
      }
    } finally { setLoadingChamadas(false); }
  }

  useEffect(() => {
    if (tab === 'chamadas') loadChamadas();
    if (tab === 'partners' && !partnersData) loadPartners();
    if (tab === 'feedback') loadFeedback();
    if (tab === 'erros') loadErrors();
  }, [tab, filterStatus, feedbackFilter]);

  async function loadPartners() {
    setLoadingPartners(true);
    try {
      const data = await apiFetch('/admin/parceiros/leads');
      setPartnersData(data);
    } finally { setLoadingPartners(false); }
  }

  async function loadFeedback() {
    setLoadingFeedback(true);
    try {
      const data = await apiFetch('/feedback');
      setFeedbackList(Array.isArray(data) ? data : []);
    } catch { setFeedbackList([]); }
    finally { setLoadingFeedback(false); }
  }

  async function loadErrors() {
    setLoadingErrors(true);
    try {
      const data = await apiFetch('/error-log');
      setErrorList(Array.isArray(data) ? data : []);
    } catch { setErrorList([]); }
    finally { setLoadingErrors(false); }
  }

  async function updateFeedback(id: string, updates: Record<string, any>) {
    await apiFetch(`/feedback/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
    loadFeedback();
  }

  async function updateChamada(id: string, updates: Partial<Chamada>) {
    try {
      await apiFetch(`/suporte/chamadas/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
      toast({ title: 'Chamada atualizada' });
      loadChamadas();
    } catch { toast({ title: 'Erro ao atualizar', variant: 'destructive' }); }
  }

  // Métricas calculadas
  const ativos = tenants.filter(t => t.assinatura_status === 'ativo');
  const trial = tenants.filter(t => t.assinatura_status === 'trial');
  const cancelados = tenants.filter(t => ['cancelado', 'suspenso'].includes(t.assinatura_status));
  const mrr = ativos.reduce((acc, t) => acc + (PLAN_PRICES[t.plan] ?? 0), 0);
  const expirando = tenants.filter(t => {
    if (!t.assinatura_expira_em) return false;
    const d = new Date(t.assinatura_expira_em);
    const diff = (d.getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 7;
  });

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'saude', label: 'Saúde do Hub', icon: <Heart size={16} /> },
    { key: 'chamadas', label: 'Chamadas', icon: <PhoneCall size={16} /> },
    { key: 'feedback', label: 'Feedbacks', icon: <MessageSquare size={16} /> },
    { key: 'erros', label: 'Erros Detectados', icon: <ShieldAlert size={16} /> },
    { key: 'partners', label: 'Leads Partners', icon: <Briefcase size={16} /> },
    { key: 'guia', label: 'Guia do COO', icon: <BookOpen size={16} /> },
  ];

  const FEEDBACK_TYPE_STYLE: Record<string, string> = {
    bug: 'bg-red-100 text-red-700 border-red-200',
    sugestao: 'bg-blue-100 text-blue-700 border-blue-200',
    melhoria: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  const FEEDBACK_STATUS_STYLE: Record<string, string> = {
    novo: 'bg-purple-100 text-purple-700',
    em_analise: 'bg-yellow-100 text-yellow-700',
    resolvido: 'bg-green-100 text-green-700',
  };

  const feedbackFiltrado = feedbackFilter === 'todos'
    ? feedbackList
    : feedbackList.filter(f => f.type === feedbackFilter || f.status === feedbackFilter);

  return (
    <Layout>
      <div className="px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="text-purple-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold">Central de Operações</h1>
            <p className="text-sm text-muted-foreground">Visão completa do Ecossistema Mirage</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-muted rounded-lg p-1 w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t.key ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ─── ABA SAÚDE ─── */}
        {tab === 'saude' && (
          <div className="space-y-6">
            {/* Status da API */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Status em tempo real</h2>
              <Button variant="outline" size="sm" onClick={loadSaude} className="gap-2">
                <RefreshCw size={14} /> Atualizar
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className={`border-l-4 ${apiOk ? 'border-l-green-500' : 'border-l-red-500'}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">API Hub</p>
                      <p className="text-xl font-bold mt-1">{apiOk === null ? '...' : apiOk ? 'Online' : 'Offline'}</p>
                    </div>
                    {apiOk ? <CheckCircle2 className="text-green-500" size={28} /> : <AlertTriangle className="text-red-500" size={28} />}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">Assinantes Ativos</p>
                      <p className="text-2xl font-bold mt-1">{loadingSaude ? '...' : ativos.length}</p>
                    </div>
                    <Users className="text-purple-500" size={28} />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">Em Trial</p>
                      <p className="text-2xl font-bold mt-1">{loadingSaude ? '...' : trial.length}</p>
                    </div>
                    <Clock className="text-yellow-500" size={28} />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">MRR Estimado</p>
                      <p className="text-2xl font-bold mt-1">
                        {loadingSaude ? '...' : `R$ ${mrr.toLocaleString('pt-BR')}`}
                      </p>
                    </div>
                    <DollarSign className="text-green-500" size={28} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Apps Externos */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package size={16}/>Status dos Apps</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { name: 'Kanban Mirage', url: '/hub/kanban', status: 'live' },
                    { name: 'Custos e Orçamentos', url: '/hub/custos/fichas', status: 'live' },
                    { name: 'PLM Mirage', url: '/hub/plm', status: 'live' },
                    { name: 'Moda Conecta', url: '/hub/comunidade', status: 'live' },
                    { name: 'CRM Mirage', url: 'https://mirage.wts.chat', status: 'externo' },
                    { name: 'ERP Mirage', url: 'https://erp.gestaomirage.com.br', status: 'externo' },
                    { name: 'Hub Central', url: 'https://www.gestaomirage.com.br', status: 'live' },
                  ].map(app => (
                    <a key={app.name} href={app.url}
                      {...(app.url.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors">
                      <span className="text-sm font-medium">{app.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        app.status === 'live' ? 'bg-green-100 text-green-700' :
                        app.status === 'em breve' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-50 text-blue-600'}`}>
                        {app.status === 'live' ? '● Live' : app.status === 'em breve' ? '● Em breve' : '● Externo'}
                      </span>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tenants expirando */}
            {expirando.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                <CardHeader><CardTitle className="text-base flex items-center gap-2 text-yellow-700"><AlertTriangle size={16}/>Assinaturas expirando em 7 dias</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {expirando.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-2 bg-white dark:bg-background rounded border">
                        <span className="text-sm font-medium">{t.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Expira: {new Date(t.assinatura_expira_em!).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de tenants */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 size={16}/>Todas as Empresas ({tenants.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {loadingSaude ? (
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                  ) : tenants.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.slug}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground capitalize">{t.plan ?? 'sem plano'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          t.assinatura_status === 'ativo' ? 'bg-green-100 text-green-700' :
                          t.assinatura_status === 'trial' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>{t.assinatura_status ?? 'trial'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── ABA CHAMADAS ─── */}
        {tab === 'chamadas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Chamadas de Suporte</h2>
              <div className="flex items-center gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="aberto">Aberto</SelectItem>
                    <SelectItem value="em_atendimento">Em atendimento</SelectItem>
                    <SelectItem value="resolvido">Resolvido</SelectItem>
                    <SelectItem value="fechado">Fechado</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={loadChamadas} className="gap-2">
                  <RefreshCw size={14} />
                </Button>
              </div>
            </div>

            {loadingChamadas ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando chamadas...</p>
            ) : chamadasError === 'setup' ? (
              <Card>
                <CardContent className="py-10 text-center space-y-3">
                  <Database className="mx-auto text-amber-400" size={36} />
                  <p className="font-semibold text-sm">Tabela de chamadas ainda não criada</p>
                  <p className="text-xs text-muted-foreground">Execute o SQL de setup na aba <strong>Guia do COO → Setup de Banco de Dados</strong> no Supabase SQL Editor.</p>
                  <Button variant="outline" size="sm" onClick={() => setTab('guia')}>
                    Ver instruções de setup
                  </Button>
                </CardContent>
              </Card>
            ) : chamadas.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="mx-auto mb-3 text-green-500" size={40} />
                  <p className="text-sm text-muted-foreground">Nenhuma chamada {filterStatus !== 'todos' ? `com status "${filterStatus}"` : 'registrada'}.</p>
                </CardContent>
              </Card>
            ) : chamadas.map(c => (
              <Card key={c.id} className="overflow-hidden">
                <div
                  className="flex items-start justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIO_COLOR[c.prioridade] ?? ''}`}>
                        {c.prioridade}
                      </span>
                      <span className="text-xs text-muted-foreground">{c.categoria}</span>
                    </div>
                    <p className="font-medium text-sm">{c.assunto}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.tenant_name} · {c.user_email} · {new Date(c.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="ml-2 text-muted-foreground">
                    {expandedId === c.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {expandedId === c.id && (
                  <CardContent className="pt-0 border-t bg-muted/20 space-y-4">
                    {c.descricao && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Descrição</p>
                        <p className="text-sm bg-background p-3 rounded border">{c.descricao}</p>
                      </div>
                    )}

                    {/* Update status */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Alterar Status</p>
                        <Select defaultValue={c.status} onValueChange={val => updateChamada(c.id, { status: val })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aberto">Aberto</SelectItem>
                            <SelectItem value="em_atendimento">Em atendimento</SelectItem>
                            <SelectItem value="resolvido">Resolvido</SelectItem>
                            <SelectItem value="fechado">Fechado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Prioridade</p>
                        <Select defaultValue={c.prioridade} onValueChange={val => updateChamada(c.id, { prioridade: val })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baixa">Baixa</SelectItem>
                            <SelectItem value="media">Média</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="critica">Crítica</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Notas internas</p>
                      <Textarea
                        placeholder="Anotações sobre essa chamada..."
                        defaultValue={c.notas_admin ?? ''}
                        onChange={e => setEditingNota(prev => ({ ...prev, [c.id]: e.target.value }))}
                        rows={3}
                      />
                      <Button
                        size="sm" className="mt-2"
                        onClick={() => updateChamada(c.id, { notas_admin: editingNota[c.id] ?? c.notas_admin ?? '' })}
                      >
                        Salvar nota
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* ─── ABA FEEDBACKS ─── */}
        {tab === 'feedback' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Feedbacks dos Usuários</h2>
              <div className="flex items-center gap-2">
                <Select value={feedbackFilter} onValueChange={setFeedbackFilter}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="sugestao">Sugestão</SelectItem>
                    <SelectItem value="melhoria">Melhoria</SelectItem>
                    <SelectItem value="novo">Status: Novo</SelectItem>
                    <SelectItem value="em_analise">Em análise</SelectItem>
                    <SelectItem value="resolvido">Resolvido</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={loadFeedback} className="gap-2">
                  <RefreshCw size={14} />
                </Button>
              </div>
            </div>

            {/* Contadores */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Bugs', key: 'bug', icon: <Bug size={16} className="text-red-500"/>, color: 'border-l-red-500' },
                { label: 'Sugestões', key: 'sugestao', icon: <Lightbulb size={16} className="text-blue-500"/>, color: 'border-l-blue-500' },
                { label: 'Melhorias', key: 'melhoria', icon: <Zap size={16} className="text-amber-500"/>, color: 'border-l-amber-500' },
              ].map(({ label, key, icon, color }) => (
                <Card key={key} className={`border-l-4 ${color}`}>
                  <CardContent className="pt-4 pb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{label}</p>
                      <p className="text-2xl font-bold">{feedbackList.filter(f => f.type === key).length}</p>
                    </div>
                    {icon}
                  </CardContent>
                </Card>
              ))}
            </div>

            {loadingFeedback ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando feedbacks...</p>
            ) : feedbackFiltrado.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="mx-auto mb-3 text-muted-foreground" size={40} />
                  <p className="text-sm text-muted-foreground">Nenhum feedback recebido ainda.</p>
                </CardContent>
              </Card>
            ) : feedbackFiltrado.map((f: any) => (
              <Card key={f.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${FEEDBACK_TYPE_STYLE[f.type] ?? 'bg-gray-100 text-gray-600'}`}>
                          {f.type === 'bug' ? '🐛 Bug' : f.type === 'sugestao' ? '💡 Sugestão' : '⚡ Melhoria'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FEEDBACK_STATUS_STYLE[f.status] ?? 'bg-gray-100'}`}>
                          {f.status === 'novo' ? 'Novo' : f.status === 'em_analise' ? 'Em análise' : 'Resolvido'}
                        </span>
                        <span className="text-xs text-muted-foreground">{f.tenantName ?? 'Desconhecido'}</span>
                        <span className="text-xs text-muted-foreground">{f.userEmail}</span>
                      </div>
                      <p className="font-semibold text-sm">{f.title}</p>
                      {f.description && <p className="text-xs text-muted-foreground mt-1">{f.description}</p>}
                      {f.pageUrl && <p className="text-xs text-muted-foreground mt-1 font-mono">{f.pageUrl}</p>}
                      <p className="text-xs text-muted-foreground mt-2">{new Date(f.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Select defaultValue={f.status} onValueChange={val => updateFeedback(f.id, { status: val })}>
                        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="novo">Novo</SelectItem>
                          <SelectItem value="em_analise">Em análise</SelectItem>
                          <SelectItem value="resolvido">Resolvido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {f.adminNotes !== undefined && (
                    <div className="mt-3 pt-3 border-t">
                      <Textarea
                        placeholder="Notas internas sobre este feedback..."
                        defaultValue={f.adminNotes ?? ''}
                        rows={2}
                        className="text-xs"
                        onBlur={e => updateFeedback(f.id, { adminNotes: e.target.value })}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ─── ABA ERROS DETECTADOS ─── */}
        {tab === 'erros' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Erros Detectados Automaticamente</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Erros JS capturados silenciosamente de todos os usuários</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadErrors} className="gap-2">
                <RefreshCw size={14} /> Atualizar
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-4 pb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Total de Erros</p>
                    <p className="text-2xl font-bold">{errorList.length}</p>
                  </div>
                  <Bug size={24} className="text-red-400" />
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-orange-400">
                <CardContent className="pt-4 pb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Tenants Afetados</p>
                    <p className="text-2xl font-bold">{new Set(errorList.map((e: any) => e.tenantId).filter(Boolean)).size}</p>
                  </div>
                  <Building2 size={24} className="text-orange-400" />
                </CardContent>
              </Card>
            </div>

            {loadingErrors ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando erros...</p>
            ) : errorList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="mx-auto mb-3 text-green-500" size={40} />
                  <p className="font-semibold text-sm text-green-700">Nenhum erro detectado</p>
                  <p className="text-xs text-muted-foreground mt-1">O sistema está monitorando em tempo real todos os tenants.</p>
                </CardContent>
              </Card>
            ) : errorList.map((e: any, idx: number) => (
              <Card key={e.id ?? idx} className="border-l-4 border-l-red-400">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Erro JS</span>
                        {e.userEmail && <span className="text-xs text-muted-foreground">{e.userEmail}</span>}
                        {e.tenantId && <span className="text-xs text-muted-foreground font-mono">{e.tenantId.slice(0, 8)}…</span>}
                      </div>
                      <p className="font-semibold text-sm text-red-700 break-all">{e.errorMessage}</p>
                      {e.pageUrl && <p className="text-xs text-muted-foreground font-mono mt-1 break-all">{e.pageUrl}</p>}
                      {e.stack && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Ver stack trace</summary>
                          <pre className="text-xs mt-1 bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">{e.stack}</pre>
                        </details>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">{new Date(e.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ─── ABA LEADS PARTNERS ─── */}
        {tab === 'partners' && (
          <div className="space-y-6">
            {loadingPartners ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw size={20} className="animate-spin text-muted-foreground mr-2" />
                <span className="text-muted-foreground">Carregando leads…</span>
              </div>
            ) : !partnersData ? (
              <div className="text-center py-16 text-muted-foreground text-sm">
                Nenhum dado disponível. <Button variant="ghost" size="sm" onClick={loadPartners}>Tentar novamente</Button>
              </div>
            ) : (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total de Leads', value: partnersData.totalLeads, icon: <Link2 size={18} className="text-violet-600" />, color: 'bg-violet-50' },
                    { label: 'Empresas únicas', value: partnersData.tenantsUnicos, icon: <Building2 size={18} className="text-blue-600" />, color: 'bg-blue-50' },
                    { label: 'Parceiros ativos', value: partnersData.porParceiro.length, icon: <Briefcase size={18} className="text-orange-600" />, color: 'bg-orange-50' },
                    { label: 'Leads este mês', value: partnersData.leads.filter((l: any) => new Date(l.created_at) > new Date(Date.now() - 30 * 86400000)).length, icon: <TrendingUp size={18} className="text-green-600" />, color: 'bg-green-50' },
                  ].map(m => (
                    <Card key={m.label}>
                      <CardContent className="pt-5 pb-5">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${m.color}`}>{m.icon}</div>
                        <p className="text-2xl font-bold">{m.value}</p>
                        <p className="text-xs text-muted-foreground">{m.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Por parceiro */}
                {partnersData.porParceiro.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">Leads por Parceiro</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {partnersData.porParceiro.map((p: any) => (
                          <div key={p.partner_id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Briefcase size={14} className="text-violet-600" />
                              <span className="text-sm font-medium">{p.partner_name ?? p.partner_id}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-muted rounded-full h-1.5">
                                <div
                                  className="bg-violet-500 h-1.5 rounded-full"
                                  style={{ width: `${Math.min(100, (p.total / partnersData.totalLeads) * 100)}%` }}
                                />
                              </div>
                              <Badge variant="secondary">{p.total} leads</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tabela de leads recentes */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Leads Recentes</CardTitle>
                      <Button size="sm" variant="outline" onClick={loadPartners} className="gap-1">
                        <RefreshCw size={13} />Atualizar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {partnersData.leads.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Ainda não há leads registrados. Os cliques nos links de parceiros aparecerão aqui.</p>
                    ) : (
                      <div className="overflow-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Empresa</th>
                              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">E-mail</th>
                              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Parceiro</th>
                              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Cupom</th>
                              <th className="text-left py-2 font-medium text-muted-foreground">Data</th>
                            </tr>
                          </thead>
                          <tbody>
                            {partnersData.leads.slice(0, 50).map((l: any) => (
                              <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="py-2 pr-4">{l.tenant_name ?? l.tenant_id?.slice(0, 8)}</td>
                                <td className="py-2 pr-4 text-muted-foreground">{l.user_email ?? '—'}</td>
                                <td className="py-2 pr-4">
                                  <Badge variant="secondary" className="font-normal">{l.partner_name ?? l.partner_id}</Badge>
                                </td>
                                <td className="py-2 pr-4 font-mono text-xs text-violet-700">{l.cupom ?? '—'}</td>
                                <td className="py-2 text-muted-foreground text-xs">
                                  {new Date(l.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {partnersData.leads.length > 50 && (
                          <p className="text-xs text-muted-foreground text-center mt-3">Mostrando 50 de {partnersData.leads.length} leads</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ─── ABA GUIA DO COO ─── */}
        {tab === 'guia' && (
          <div className="space-y-8">

            {/* Intro */}
            <Card className="bg-gradient-to-br from-purple-600 to-purple-800 text-white border-0">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-3 mb-3">
                  <Zap size={24} />
                  <h2 className="text-xl font-bold">Ecossistema Mirage — Guia do COO</h2>
                </div>
                <p className="text-purple-100 text-sm leading-relaxed">
                  Este documento é seu mapa completo do Mirage Hub: o que foi construído, como funciona, onde estamos e quais são os próximos passos. Atualizado em Abril/2026.
                </p>
              </CardContent>
            </Card>

            {/* O que é */}
            <Section icon={<Globe size={18} className="text-purple-600"/>} title="O que é o Ecossistema Mirage">
              <p className="text-sm text-muted-foreground leading-relaxed">
                O <strong>Mirage Hub</strong> é uma plataforma SaaS multitenant voltada para confecções e empresas do setor têxtil/vestuário brasileiro. O modelo é um <strong>hub centralizado</strong>: o cliente acessa um único painel e de lá acessa todos os apps do ecossistema, cada um com sua função específica.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                O negócio funciona como <strong>assinatura mensal</strong> com 3 planos (Starter, Pro, Enterprise), cobrança via <strong>Asaas</strong> (gateway brasileiro), e o cliente ganha acesso progressivo a mais apps conforme o plano contratado.
              </p>
            </Section>

            {/* Arquitetura */}
            <Section icon={<Code2 size={18} className="text-purple-600"/>} title="Arquitetura Técnica">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { layer: 'Frontend', tech: 'React + Vite + TypeScript', detail: 'Tailwind CSS, shadcn/ui, Wouter (roteamento), React Query' },
                  { layer: 'Backend / API', tech: 'Node.js + Express + TypeScript', detail: 'JWT via Supabase Auth, Zod validation, pino logging' },
                  { layer: 'Banco de Dados', tech: 'Supabase (PostgreSQL)', detail: 'Row Level Security, realtime, multi-tenant por tenant_id' },
                ].map(a => (
                  <div key={a.layer} className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Database size={14} className="text-purple-600"/>
                      <span className="text-xs font-bold text-purple-700 uppercase">{a.layer}</span>
                    </div>
                    <p className="text-sm font-semibold mb-1">{a.tech}</p>
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 rounded border bg-muted/20 text-sm">
                <span className="font-medium">Hospedagem:</span> <span className="text-muted-foreground">Cloud (Hub + API) · Domínio: www.gestaomirage.com.br</span>
              </div>
            </Section>

            {/* Os 5 Apps */}
            <Section icon={<Layers size={18} className="text-purple-600"/>} title="Os 5 Aplicativos do Ecossistema">
              <div className="space-y-3">
                {[
                  {
                    name: 'Kanban Mirage', emoji: '🗂️', plano: 'Starter+',
                    status: 'Integrado no Hub', statusColor: 'bg-green-100 text-green-700',
                    desc: 'Gestão de pedidos e produção integrada ao Hub. Controla pedidos por cliente, grades de tamanho, financeiro (sinal/saldo), desconto e prazo de entrega. Totalmente migrado para dentro do Hub.',
                    url: '/hub/kanban',
                  },
                  {
                    name: 'Orçamento Mirage', emoji: '💰', plano: 'Starter+',
                    status: 'Integrado no Hub', statusColor: 'bg-green-100 text-green-700',
                    desc: 'Gerador de fichas de custo e orçamentos para confecções. Calcula preço de venda com base em matéria-prima, mão de obra, custos fixos e margem. Totalmente integrado ao Hub e ao módulo de Pedidos.',
                    url: '/hub/custos/fichas',
                  },
                  {
                    name: 'PLM Mirage', emoji: '🎨', plano: 'Pro+',
                    status: 'Integrado no Hub', statusColor: 'bg-green-100 text-green-700',
                    desc: 'Gestão do ciclo de vida de produtos: fichas técnicas, materiais & custos, modelagem, pilotagem e fluxo de aprovação em 5 etapas. 13 tabelas (plm_*), 11 módulos no sidebar, API completa em /api/plm/*. Totalmente integrado ao Hub.',
                    url: '/hub/plm',
                  },
                  {
                    name: 'Moda Conecta', emoji: '🤝', plano: 'Pro+',
                    status: 'Integrado no Hub', statusColor: 'bg-green-100 text-green-700',
                    desc: 'Rede B2B privada do setor têxtil: fornecedores verificados, perfis com especialidades e avaliações, pré-cadastro de novos fornecedores. Totalmente integrada ao Hub em /hub/comunidade.',
                    url: '/hub/comunidade',
                  },
                  {
                    name: 'CRM Mirage', emoji: '💬', plano: 'Enterprise',
                    status: 'Externo (WTS)', statusColor: 'bg-purple-100 text-purple-700',
                    desc: 'CRM com SDR inteligente via WhatsApp. Atendimento automático, funil de vendas e histórico de conversas. Integrado com WhatsApp Business via WTS. Rodando em mirage.wts.chat.',
                    url: 'https://mirage.wts.chat',
                  },
                  {
                    name: 'ERP Mirage', emoji: '📊', plano: 'Enterprise',
                    status: 'Externo (Parceiro)', statusColor: 'bg-gray-100 text-gray-700',
                    desc: 'Sistema fiscal e contábil completo: emissão de NF-e, controle financeiro (contas a pagar/receber), relatórios. Rodando em erp.gestaomirage.com.br em parceria com fornecedor externo.',
                    url: 'https://erp.gestaomirage.com.br',
                  },
                  {
                    name: 'Partners Mirage', emoji: '🤝', plano: 'Todos os planos',
                    status: 'Ativo com rastreio', statusColor: 'bg-violet-100 text-violet-700',
                    desc: 'Rede de parceiros especializados em confecção: contadores, agências de marketing e consultores. Links rastreáveis com cupom por empresa. Leads disponíveis na aba "Leads Partners".',
                    url: '/hub/partners',
                  },
                ].map(app => (
                  <div key={app.name} className="p-4 rounded-lg border hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{app.emoji}</span>
                        <div>
                          <p className="font-semibold text-sm">{app.name}</p>
                          <span className="text-xs text-muted-foreground">Plano: {app.plano}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${app.statusColor}`}>{app.status}</span>
                        <a href={app.url}
                          {...(app.url.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                          className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                          Acessar <ArrowRight size={10}/>
                        </a>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{app.desc}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Planos */}
            <Section icon={<DollarSign size={18} className="text-purple-600"/>} title="Planos e Monetização">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { name: 'Starter', price: 'R$ 197/mês', apps: 'Kanban + Orçamento', limits: '3 usuários · 50 referências · 20 orçamentos/mês', color: 'border-blue-200 bg-blue-50/50' },
                  { name: 'Pro', price: 'R$ 397/mês', apps: 'Starter + Comunidade', limits: '10 usuários · 300 referências · 100 orçamentos/mês', color: 'border-purple-200 bg-purple-50/50' },
                  { name: 'Enterprise', price: 'R$ 797/mês', apps: 'Todos os 5 apps', limits: 'Usuários ilimitados · Tudo ilimitado', color: 'border-yellow-200 bg-yellow-50/50' },
                ].map(p => (
                  <div key={p.name} className={`p-4 rounded-lg border ${p.color}`}>
                    <p className="font-bold text-sm mb-1">{p.name}</p>
                    <p className="text-lg font-bold text-purple-700 mb-2">{p.price}</p>
                    <p className="text-xs text-muted-foreground mb-1"><strong>Apps:</strong> {p.apps}</p>
                    <p className="text-xs text-muted-foreground">{p.limits}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 rounded border bg-muted/20 text-sm space-y-1">
                <p><span className="font-medium">Gateway de pagamento:</span> <span className="text-muted-foreground">Asaas (boleto, PIX, cartão)</span></p>
                <p><span className="font-medium">Trial:</span> <span className="text-muted-foreground">14 dias grátis sem cartão de crédito</span></p>
                <p><span className="font-medium">Webhook:</span> <span className="text-muted-foreground">Asaas notifica o Hub via /api/billing/webhooks/asaas — ativa/suspende automaticamente</span></p>
              </div>
            </Section>

            {/* Multi-tenancy */}
            <Section icon={<Building2 size={18} className="text-purple-600"/>} title="Como Funciona o Multi-tenancy">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Cada empresa cliente é um <strong>tenant</strong> com seu próprio ID no banco. Todos os dados de produção, orçamentos, clientes e usuários de um tenant são isolados por <code className="text-xs bg-muted px-1 rounded">tenant_id</code>. Um usuário pode pertencer a múltiplos tenants.
              </p>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {['tenants', 'tenant_users', 'tenant_apps', 'referencias', 'orcamentos', 'fichas_custo', 'pedidos', 'contas_a_pagar'].map(t => (
                  <code key={t} className="bg-muted px-2 py-1 rounded text-center block">{t}</code>
                ))}
              </div>
            </Section>

            {/* Estágio atual */}
            <Section icon={<Flag size={18} className="text-purple-600"/>} title="Plano Mestre — Julho 2026">
              <p className="text-xs text-muted-foreground mb-4">Estado real de cada frente. Atualizado em 11/07/2026.</p>

              {/* Bloco: Infraestrutura SaaS */}
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">🏗️ Infraestrutura SaaS (Mirage Hub)</p>
              <div className="space-y-1.5 mb-5">
                {[
                  { item: 'Hub Central live em www.gestaomirage.com.br', done: true },
                  { item: 'Landing page + jornada self-serve (trial, IA de pré-venda)', done: true },
                  { item: 'Autenticação, billing Asaas, multi-tenancy completo', done: true },
                  { item: 'Painel de Admin (gestão de tenants, usuários, planos)', done: true },
                  { item: 'Kanban, Custos/Orçamentos, PLM, Moda Conecta — todos integrados', done: true },
                  { item: 'App mobile ATHOS (Expo React Native)', done: true },
                  { item: 'ATHOS MENTOR — IA estratégica para o admin (/hub/mentor)', done: true },
                  { item: 'Portal de Onboarding para novos tenants', done: true },
                ].map(({ item, done }) => (
                  <div key={item} className={`flex items-start gap-3 p-2 rounded-lg ${done ? 'bg-green-50 dark:bg-green-950/20' : 'bg-muted/30'}`}>
                    {done ? <CheckCircle2 size={14} className="text-green-600 mt-0.5 shrink-0"/> : <Clock size={14} className="text-muted-foreground mt-0.5 shrink-0"/>}
                    <span className={`text-xs ${done ? 'text-green-800 dark:text-green-300' : 'text-muted-foreground'}`}>{item}</span>
                  </div>
                ))}
              </div>

              {/* Bloco: Máquina Comercial R2PB */}
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">⚙️ Máquina Comercial (R2PB — cliente piloto)</p>
              <div className="space-y-1.5 mb-5">
                {[
                  { item: 'CRM Helena configurado com pipeline Vendas PRO + Nutrição', done: true },
                  { item: 'Z-API (instância r2pb) com credenciais salvas no Hub — send-message centralizado', done: true },
                  { item: 'Endpoint /api/internal/zapi/send-message operacional (hub envia, n8n não guarda credenciais)', done: true },
                  { item: 'Workflow n8n R2PB_CALL_CONFIRMATION_AND_REMINDER_ZAPI_V2 — confirmação de reunião ✅ + lembrete 1h antes ✅', done: true },
                  { item: 'Tabela leads_espelho — rastreia nome/email/whatsapp de leads para o fluxo de agendamento', done: true },
                  { item: 'Endpoints /api/internal/leads/* — by-email, mark-agendado, pending-followup, mark-followup-sent', done: true },
                  { item: 'Workflow n8n MIRAGE_ZAPI_POSTFUNNEL_ROUTER — roteador nurture/rescue por classificação de lead', done: true },
                  { item: 'Endpoint /api/internal/lead-context — classifica lead (dormant/rescue/human_active/awaiting_human)', done: true },
                  { item: 'Auto-resposta a mensagens recebidas (robô de entrada)', done: false },
                  { item: 'Webhook Z-API configurado apontando para POSTFUNNEL_ROUTER (resolver conflito Helena x n8n)', done: false },
                ].map(({ item, done }) => (
                  <div key={item} className={`flex items-start gap-3 p-2 rounded-lg ${done ? 'bg-green-50 dark:bg-green-950/20' : 'bg-amber-50 dark:bg-amber-950/20'}`}>
                    {done ? <CheckCircle2 size={14} className="text-green-600 mt-0.5 shrink-0"/> : <Clock size={14} className="text-amber-500 mt-0.5 shrink-0"/>}
                    <span className={`text-xs ${done ? 'text-green-800 dark:text-green-300' : 'text-amber-700 dark:text-amber-400'}`}>{item}</span>
                  </div>
                ))}
              </div>

              {/* Bloco: Growth OS */}
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">🚀 Mirage Growth OS (máquina de marketing admin)</p>
              <div className="space-y-1.5 mb-5">
                {[
                  { item: 'Cockpit Growth OS em /hub/growth — visão executiva de campanhas, providers, fila de aprovação', done: true },
                  { item: 'Tabelas growth_campaigns, growth_assets, growth_asset_versions, growth_provider_runs', done: true },
                  { item: 'Provider HeyGen (vídeo avatar) — integrado e testado end-to-end', done: true },
                  { item: 'Provider Banana (Gemini nano-banana image) — integrado e testado, salva no Object Storage', done: true },
                  { item: 'Provider Router — centraliza seleção e fallback por tipo de conteúdo', done: true },
                  { item: 'Config por empresa (company_slug) — admin filtra R2PB, Mirage, etc.', done: true },
                  { item: 'Provider Midjourney — BLOQUEADO (aguarda infraestrutura Discord + serviço-ponte)', done: false },
                  { item: 'Interface de criação de campanhas com briefing e seleção de assets', done: false },
                ].map(({ item, done }) => (
                  <div key={item} className={`flex items-start gap-3 p-2 rounded-lg ${done ? 'bg-green-50 dark:bg-green-950/20' : 'bg-amber-50 dark:bg-amber-950/20'}`}>
                    {done ? <CheckCircle2 size={14} className="text-green-600 mt-0.5 shrink-0"/> : <Clock size={14} className="text-amber-500 mt-0.5 shrink-0"/>}
                    <span className={`text-xs ${done ? 'text-green-800 dark:text-green-300' : 'text-amber-700 dark:text-amber-400'}`}>{item}</span>
                  </div>
                ))}
              </div>

              {/* Bloco: Próximos passos */}
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">⏭️ Próximos Passos Prioritários</p>
              <div className="space-y-1.5">
                {[
                  'Resolver conflito webhook Z-API (Helena x n8n) — solução: n8n como intermediário, repassa para Helena',
                  'Testar ponta a ponta: lead agenda no Google Calendar → confirmação + lembrete Z-API chegam corretos',
                  'Robô de entrada: auto-resposta a mensagens recebidas (novo workflow n8n)',
                  'Lançamento comercial Mirage Hub — primeiro cliente pagante fora da R2PB',
                  'Interface de criação de campanhas no Growth OS',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 p-2 rounded-lg bg-violet-50 dark:bg-violet-950/20">
                    <ArrowRight size={14} className="text-violet-500 mt-0.5 shrink-0"/>
                    <span className="text-xs text-violet-700 dark:text-violet-300">{item}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Setup SQL */}
            <Section icon={<Database size={18} className="text-purple-600"/>} title="Setup de Banco de Dados — Tabela de Chamadas">
              <div className="p-3 rounded-lg border bg-amber-50 border-amber-200 text-sm mb-2">
                <p className="font-semibold text-amber-800 mb-1">Execute uma vez no Supabase SQL Editor</p>
                <p className="text-xs text-amber-700">Acesse <strong>supabase.com → Projeto myoopircjguuaaqlmjax → SQL Editor</strong> e rode o SQL abaixo para criar a tabela de suporte:</p>
              </div>
              <pre className="bg-gray-900 text-green-300 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed whitespace-pre">{`CREATE TABLE IF NOT EXISTS suporte_chamadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  tenant_name TEXT NOT NULL DEFAULT 'Desconhecido',
  user_email TEXT,
  assunto TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'aberto',
  prioridade TEXT NOT NULL DEFAULT 'media',
  categoria TEXT NOT NULL DEFAULT 'suporte',
  notas_admin TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolvido_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_suporte_status
  ON suporte_chamadas(status);
CREATE INDEX IF NOT EXISTS idx_suporte_tenant
  ON suporte_chamadas(tenant_id);`}</pre>
            </Section>

            {/* Próximas etapas */}
            <Section icon={<TrendingUp size={18} className="text-purple-600"/>} title="Próximas Etapas — Roadmap">
              <div className="space-y-3">
                {[
                  {
                    fase: 'Fase 1 — Produto ✅ Concluída',
                    color: 'border-l-green-500',
                    done: true,
                    items: [
                      'Kanban integrado ao Hub (/hub/kanban)',
                      'Custos e Orçamentos integrados ao Hub (/hub/custos)',
                      'PLM completo — 13 tabelas, 11 módulos (/hub/plm)',
                      'Comunidade Moda Conecta integrada (/hub/comunidade)',
                      'App mobile ATHOS (Expo React Native)',
                      'ATHOS MENTOR — IA estratégica para o admin',
                      'IA de pré-venda pública (/api/mirage/assistant)',
                      'Portal de onboarding para novos tenants',
                      'Jornada comercial self-serve (trial + IA + demo)',
                    ],
                  },
                  {
                    fase: 'Fase 2 — Lançamento (01/07/2025)',
                    color: 'border-l-amber-500',
                    done: false,
                    items: [
                      'Abertura oficial da Fase Fundadora — vagas limitadas',
                      'Número de WhatsApp real configurado e operacional',
                      'Campanha de aquisição com os criativos gerados',
                      'Onboarding acompanhado dos primeiros clientes fundadores',
                      'Configuração de planos e cobrança real via Asaas',
                    ],
                  },
                  {
                    fase: 'Fase 3 — Expansão (pós-lançamento)',
                    color: 'border-l-blue-500',
                    done: false,
                    items: [
                      'CRM e ERP nativos com integração direta ao banco do Hub',
                      'Relatórios avançados e dashboard analítico por cliente',
                      'Expansão para outros segmentos do setor têxtil',
                      'Automações via n8n integradas à jornada do cliente',
                    ],
                  },
                ].map(fase => (
                  <div key={fase.fase} className={`p-4 rounded-lg border-l-4 border bg-muted/20 ${fase.color}`}>
                    <p className={`font-semibold text-sm mb-2 ${fase.done ? 'text-green-700 dark:text-green-400' : ''}`}>{fase.fase}</p>
                    <ul className="space-y-1">
                      {fase.items.map(i => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          {fase.done
                            ? <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-green-500"/>
                            : <ArrowRight size={12} className="mt-0.5 shrink-0 text-purple-500"/>
                          }
                          {i}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>

          </div>
        )}
      </div>
    </Layout>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-semibold text-base">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
