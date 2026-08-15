import { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Layout } from '@/components/Layout';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Users,
  Building2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Plus,
  UserPlus,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2,
  ClipboardList,
  Mail,
  Check,
  X,
  MessageSquare,
  Eye,
  EyeOff,
  MapPin,
  Phone,
  Star,
  Copy,
  Link2,
  ExternalLink,
  QrCode,
  Bell,
  Clock,
} from 'lucide-react';

const SUPER_ADMIN_EMAIL = 'clovisart13@gmail.com';

const PLAN_OPTIONS = [
  { value: 'sem_plano', label: 'Sem plano' },
  { value: 'starter', label: 'Starter — R$197/mês' },
  { value: 'pro', label: 'Pro — R$397/mês' },
  { value: 'enterprise', label: 'Enterprise — R$797/mês' },
];

const STATUS_OPTIONS = [
  { value: 'trial', label: 'Trial' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'suspenso', label: 'Suspenso' },
];

const PLAN_APPS: Record<string, string[]> = {
  starter: ['kanban', 'orcamento'],
  pro: ['kanban', 'orcamento', 'comunidade'],
  enterprise: ['kanban', 'orcamento', 'comunidade', 'crm', 'erp'],
  sem_plano: [],
};

const PLAN_PRICES: Record<string, number> = { starter: 197, pro: 397, enterprise: 797 };

export default function AdminPanel() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, ativos: 0, trial: 0, receita: 0 });
  const [lembretes, setLembretes] = useState<any>(null);
  const [lembretesLoading, setLembretesLoading] = useState(false);
  const [provisioning, setProvisioning] = useState<any[]>([]);
  const [provisioningLoading, setProvisioningLoading] = useState(false);
  const [contatados, setContatados] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('mirage_admin_contatados') || '{}'); } catch { return {}; }
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<Record<string, { plano?: string; status?: string }>>({});
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [tenantMembers, setTenantMembers] = useState<Record<string, any[]>>({});

  // Modal: Nova Empresa
  const [showNovaEmpresa, setShowNovaEmpresa] = useState(false);
  const [novaEmpresa, setNovaEmpresa] = useState({ nome: '', email: '', plano: 'starter', status: 'trial' });
  const [criandoEmpresa, setCriandoEmpresa] = useState(false);

  // Modal: Adicionar Usuário ao Tenant
  const [showNovoUsuario, setShowNovoUsuario] = useState(false);
  const [novoUsuarioTenantId, setNovoUsuarioTenantId] = useState<string>('');
  const [novoUsuario, setNovoUsuario] = useState({ email: '', senha: '', nome: '', role: 'member' });
  const [criandoUsuario, setCriandoUsuario] = useState(false);

  // Fila de Comunidade
  const filaRef = useRef<HTMLDivElement>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [leadNotas, setLeadNotas] = useState<Record<string, string>>({});
  const [leadAcao, setLeadAcao] = useState<Record<string, boolean>>({});
  const [leadInviteLinks, setLeadInviteLinks] = useState<Record<string, string>>({});
  const [linkCopiado2, setLinkCopiado2] = useState<Record<string, boolean>>({});
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  // Cadastros completos linkados a um lead pelo e-mail
  const [leadCadastros, setLeadCadastros] = useState<Record<string, any>>({});
  const [leadCadastroLoading, setLeadCadastroLoading] = useState<Record<string, boolean>>({});

  // Curadoria — aba de fornecedores ativos
  const [curadoriaTab, setCuradoriaTab] = useState<'fila' | 'ativos'>('fila');
  const [fornecedoresAtivos, setFornecedoresAtivos] = useState<any[]>([]);
  const [fornAtivosLoading, setFornAtivosLoading] = useState(false);
  const [filtroFornStatus, setFiltroFornStatus] = useState<string>('pendente');
  const [fornAcao, setFornAcao] = useState<Record<string, boolean>>({});
  const [expandedForn, setExpandedForn] = useState<string | null>(null);

  // Modal de reprovação
  const [reprovarModal, setReprovarModal] = useState<{ id: string; tipo: 'lead' | 'forn' } | null>(null);
  const [reprovarMotivo, setReprovarMotivo] = useState('');

  // Leads Mira
  const [miraLeads, setMiraLeads] = useState<any[]>([]);
  const [miraLeadsLoading, setMiraLeadsLoading] = useState(false);

  // Configuração de fases por tenant
  const [faseConfigTenantId, setFaseConfigTenantId] = useState('');
  const [faseConfig, setFaseConfig] = useState<any[]>([]);
  const [faseConfigLoading, setFaseConfigLoading] = useState(false);
  const [faseConfigSavingAdmin, setFaseConfigSavingAdmin] = useState(false);

  // Sync de assets de campanha (dev → produção)
  const [syncingAssets, setSyncingAssets] = useState(false);

  const DEV_ASSETS = [
    { company_slug: 'r2pb', campaign_id: 'r2pb_1778948949951', asset_type: 'story_frame',    storage_path: '/objects/campaign-assets/r2pb/r2pb_1778948949951/5837c4fe-0285-4e87-a3e7-05dd49970a81.jpg' },
    { company_slug: 'r2pb', campaign_id: 'r2pb_1778948949951', asset_type: 'carousel_slide', storage_path: '/objects/campaign-assets/r2pb/r2pb_1778948949951/c4608c3c-32cc-4756-b2a6-de46fa0472e1.jpg' },
    { company_slug: 'r2pb', campaign_id: 'r2pb_1778948949951', asset_type: 'feed_image',     storage_path: '/objects/campaign-assets/r2pb/r2pb_1778948949951/8d62b492-c4e6-43ca-8a57-e175f9e7c6a9.jpg' },
  ];

  const carregarMiraLeads = async () => {
    setMiraLeadsLoading(true);
    try {
      const data = await apiFetch('/chat/leads');
      setMiraLeads(data.leads ?? []);
    } catch (err: any) {
      toast({ title: 'Erro ao carregar leads', description: err.message, variant: 'destructive' });
    } finally {
      setMiraLeadsLoading(false);
    }
  };

  const carregarFaseConfig = async (tenantId: string) => {
    if (!tenantId) return;
    setFaseConfigLoading(true);
    try {
      const data = await apiFetch(`/kanban/fase-config/admin/${tenantId}`);
      setFaseConfig(data.config ?? []);
    } catch (err: any) {
      toast({ title: 'Erro ao carregar config', description: err.message, variant: 'destructive' });
    } finally {
      setFaseConfigLoading(false);
    }
  };

  const salvarFaseConfigAdmin = async () => {
    if (!faseConfigTenantId || !faseConfig.length) return;
    setFaseConfigSavingAdmin(true);
    try {
      await apiFetch(`/kanban/fase-config/admin/${faseConfigTenantId}`, {
        method: 'PUT',
        body: JSON.stringify({ config: faseConfig }),
      });
      toast({ title: 'Configuração salva!', description: `Fases do tenant ${faseConfigTenantId} atualizadas.` });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setFaseConfigSavingAdmin(false);
    }
  };

  const syncCampaignAssets = async () => {
    setSyncingAssets(true);
    let ok = 0; let skip = 0; let fail = 0;
    for (const asset of DEV_ASSETS) {
      try {
        const res = await apiFetch('/marketing/assets/direct', { method: 'POST', body: JSON.stringify(asset) });
        if (res.skipped) skip++; else ok++;
      } catch { fail++; }
    }
    setSyncingAssets(false);
    toast({ title: `Assets sincronizados`, description: `${ok} inseridos, ${skip} já existiam, ${fail} erros` });
  };

  const fetchLeads = async () => {
    setLeadsLoading(true);
    try {
      const data = await apiFetch('/moda-conecta/leads?companySlug=mirage&limit=200');
      setLeads(Array.isArray(data) ? data : []);
      const notas: Record<string, string> = {};
      (Array.isArray(data) ? data : []).forEach((l: any) => { notas[l.id] = l.reviewNotes ?? ''; });
      setLeadNotas(notas);
    } catch (err: any) {
      toast({ title: 'Erro ao carregar fila', description: err.message, variant: 'destructive' });
    } finally {
      setLeadsLoading(false);
    }
  };

  const fetchFornecedoresAtivos = async (status = filtroFornStatus) => {
    setFornAtivosLoading(true);
    try {
      const qs = status !== 'todos' ? `?status=${status}` : '';
      const data = await apiFetch(`/comunidade/admin/pre-cadastros${qs}`);
      setFornecedoresAtivos(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({ title: 'Erro ao carregar cadastros', description: err.message, variant: 'destructive' });
    } finally {
      setFornAtivosLoading(false);
    }
  };

  const aprovarFornecedor = async (id: string) => {
    setFornAcao(p => ({ ...p, [id]: true }));
    try {
      await apiFetch(`/comunidade/admin/pre-cadastros/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) });
      toast({ title: '✅ Cadastro aprovado! Envie o WhatsApp para liberar o acesso ao Hub.' });
      setFornecedoresAtivos(prev => prev.map(f => f.id === id ? { ...f, status: 'aprovado', approvedAt: new Date().toISOString() } : f));
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setFornAcao(p => ({ ...p, [id]: false }));
    }
  };

  const recusarFornecedor = async (id: string, motivo: string) => {
    setFornAcao(p => ({ ...p, [id]: true }));
    try {
      await apiFetch(`/comunidade/admin/pre-cadastros/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'reprovado', rejectionReason: motivo }) });
      toast({ title: 'Cadastro reprovado' });
      setFornecedoresAtivos(prev => prev.map(f => f.id === id ? { ...f, status: 'reprovado', rejectionReason: motivo } : f));
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setFornAcao(p => ({ ...p, [id]: false }));
    }
  };

  const enviarWhatsappHub = async (id: string) => {
    setFornAcao(p => ({ ...p, [id]: true }));
    try {
      const res = await apiFetch(`/comunidade/admin/pre-cadastros/${id}/notificar-hub`, { method: 'POST' });
      if (res?.whatsappSent) {
        toast({ title: '✅ WhatsApp enviado com link do Hub!' });
      } else {
        toast({ title: 'WhatsApp não enviado', description: res?.reason || 'Verifique o número no cadastro.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao enviar WhatsApp', description: err.message, variant: 'destructive' });
    } finally {
      setFornAcao(p => ({ ...p, [id]: false }));
    }
  };

  const toggleVerificacao = async (id: string, campo: 'verified' | 'recommended', valor: boolean) => {
    setFornAcao(p => ({ ...p, [id]: true }));
    try {
      await apiFetch(`/comunidade/admin/fornecedores/${id}/verificar`, { method: 'PATCH', body: JSON.stringify({ [campo]: valor }) });
      const key = campo === 'verified' ? 'verifiedByAdmin' : 'recommendedByAdmin';
      setFornecedoresAtivos(prev => prev.map(f => f.id === id ? { ...f, [key]: valor } : f));
      toast({ title: valor ? '✅ Selo ativado' : 'Selo removido' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setFornAcao(p => ({ ...p, [id]: false }));
    }
  };

  // Busca o pré-cadastro completo associado a um lead pelo e-mail
  const carregarCadastroLead = async (leadId: string, email: string) => {
    if (leadCadastros[leadId] !== undefined || leadCadastroLoading[leadId]) return;
    setLeadCadastroLoading(p => ({ ...p, [leadId]: true }));
    try {
      const rows = await apiFetch(`/comunidade/admin/pre-cadastros?email=${encodeURIComponent(email)}`);
      const cadastro = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      setLeadCadastros(p => ({ ...p, [leadId]: cadastro }));
    } catch {
      setLeadCadastros(p => ({ ...p, [leadId]: null }));
    } finally {
      setLeadCadastroLoading(p => ({ ...p, [leadId]: false }));
    }
  };

  // Envia WhatsApp de aprovação com link do Hub usando o pré-cadastro do lead
  const enviarWhatsappHubParaLead = async (preCadastroId: string, leadId: string) => {
    setLeadAcao(p => ({ ...p, [leadId]: true }));
    try {
      const res = await apiFetch(`/comunidade/admin/pre-cadastros/${preCadastroId}/notificar-hub`, { method: 'POST' });
      if (res?.whatsappSent) {
        toast({ title: '✅ WhatsApp enviado com link do Hub!' });
      } else {
        toast({ title: 'WhatsApp não enviado', description: res?.reason || 'Verifique o número no cadastro.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao enviar WhatsApp', description: err.message, variant: 'destructive' });
    } finally {
      setLeadAcao(p => ({ ...p, [leadId]: false }));
    }
  };

  const confirmarReprovacao = async () => {
    if (!reprovarModal || !reprovarMotivo.trim()) return;
    const { id, tipo } = reprovarModal;
    if (tipo === 'lead') {
      await patchLead(id, { status: 'rejeitado', reviewNotes: reprovarMotivo });
    } else {
      await recusarFornecedor(id, reprovarMotivo);
    }
    setReprovarModal(null);
    setReprovarMotivo('');
  };

  const patchLead = async (id: string, updates: Record<string, any>) => {
    setLeadAcao(p => ({ ...p, [id]: true }));
    try {
      const updated = await apiFetch(`/moda-conecta/leads/${id}`, {
        method: 'PATCH', body: JSON.stringify(updates),
      });
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updated } : l));
      toast({ title: 'Atualizado com sucesso' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLeadAcao(p => ({ ...p, [id]: false }));
    }
  };

  const aprovarLead = async (id: string) => {
    setLeadAcao(p => ({ ...p, [id]: true }));
    try {
      // 1. Marcar como aprovado
      await apiFetch(`/moda-conecta/leads/${id}`, {
        method: 'PATCH', body: JSON.stringify({ status: 'aprovado', reviewNotes: leadNotas[id] ?? '' }),
      });
      // 2. Gerar link de convite com token único
      const convite = await apiFetch(`/moda-conecta/leads/${id}/invite`, { method: 'POST' });
      // 3. Guardar link no estado para exibir no card expandido
      if (convite?.inviteLink) {
        setLeadInviteLinks(p => ({ ...p, [id]: convite.inviteLink }));
        setExpandedLead(id);
        toast({ title: '✅ Aprovado! Abra o card para copiar o link.' });
      } else {
        toast({ title: '✅ Aprovado!', description: 'Lead aprovado com sucesso.' });
      }
      await fetchLeads();
    } catch (err: any) {
      toast({ title: 'Erro ao aprovar', description: err.message, variant: 'destructive' });
    } finally {
      setLeadAcao(p => ({ ...p, [id]: false }));
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.email === SUPER_ADMIN_EMAIL) {
      fetchLeads();
      // Carrega pendentes do formulário completo na montagem para mostrar badge
      fetchFornecedoresAtivos('pendente');
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user?.email === SUPER_ADMIN_EMAIL && curadoriaTab === 'ativos') {
      fetchFornecedoresAtivos(filtroFornStatus);
    }
  }, [isAuthenticated, user, curadoriaTab, filtroFornStatus]);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.email !== SUPER_ADMIN_EMAIL)) {
      navigate('/hub');
    }
  }, [authLoading, isAuthenticated, user]);

  const fetchData = async (attempt = 1) => {
    setLoading(true);
    try {
      const data = await apiFetch('/billing/admin/assinaturas');
      const list = data.tenants || [];
      // Se veio vazio mas sem erro, retry automático uma vez (pode ser race condition pós-restart)
      if (list.length === 0 && attempt === 1) {
        setTimeout(() => fetchData(2), 1500);
        return;
      }
      setTenants(list);
      const ativos = list.filter((t: any) => t.assinatura_status === 'ativo').length;
      const trial = list.filter((t: any) => t.assinatura_status === 'trial').length;
      const receita = list
        .filter((t: any) => t.assinatura_status === 'ativo')
        .reduce((sum: number, t: any) => sum + (PLAN_PRICES[t.plano] || 0), 0);
      setStats({ total: list.length, ativos, trial, receita });
    } catch (err: any) {
      toast({ title: 'Erro ao carregar dados', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchLembretes = async () => {
    setLembretesLoading(true);
    try {
      const data = await apiFetch('/billing/admin/lembretes');
      setLembretes(data);
    } catch {}
    finally { setLembretesLoading(false); }
  };

  const fetchProvisioning = async () => {
    setProvisioningLoading(true);
    try {
      const data = await apiFetch('/billing/admin/provisioning');
      setProvisioning(data.items || []);
    } catch {}
    finally { setProvisioningLoading(false); }
  };

  const markProvisioningDone = async (id: number, externalId?: string) => {
    try {
      await apiFetch(`/billing/admin/provisioning/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'done', external_id: externalId || '' }),
      });
      setProvisioning(prev => prev.map(p => p.id === id ? { ...p, status: 'done', done_at: new Date().toISOString() } : p));
      toast({ title: '✅ Marcado como concluído' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.email === SUPER_ADMIN_EMAIL) {
      fetchData();
      fetchLembretes();
      fetchProvisioning();
    }
  }, [isAuthenticated, user]);

  const marcarContatado = (tenantId: string) => {
    const next = { ...contatados, [tenantId]: true };
    setContatados(next);
    try { localStorage.setItem('mirage_admin_contatados', JSON.stringify(next)); } catch {}
  };

  const msgWhatsApp = (nome: string, plano: string, diasRestantes: number) => {
    if (diasRestantes < 0) {
      return `Olá ${nome}! Notamos que sua assinatura Mirage Hub (Plano ${plano}) venceu há ${Math.abs(diasRestantes)} dia(s). Para reativar e continuar usando sem perder seus dados, acesse: https://mirage.app/planos`;
    }
    if (diasRestantes === 0) {
      return `Olá ${nome}! Sua assinatura Mirage Hub (Plano ${plano}) vence HOJE. Renove agora para não perder acesso: https://mirage.app/planos`;
    }
    return `Olá ${nome}! Sua assinatura Mirage Hub (Plano ${plano}) vence em ${diasRestantes} dia(s). Renove com antecedência e não perca o acesso: https://mirage.app/planos`;
  };

  const handleEdit = (tenantId: string, field: 'plano' | 'status', value: string) => {
    setEditingTenant(prev => ({ ...prev, [tenantId]: { ...prev[tenantId], [field]: value } }));
  };

  const handleSave = async (tenant: any) => {
    const edits = editingTenant[tenant.id];
    if (!edits) return;
    setSavingId(tenant.id);
    try {
      if (edits.plano && edits.plano !== tenant.plano) {
        await apiFetch('/billing/checkout/simular', {
          method: 'POST',
          body: JSON.stringify({
            plano_id: edits.plano === 'sem_plano' ? null : edits.plano,
            app_keys: PLAN_APPS[edits.plano] || [],
            periodo: 'mensal',
            tenant_id: tenant.id,
          }),
        });
      }
      if (edits.status && edits.status !== tenant.assinatura_status) {
        await apiFetch('/admin/tenants/' + tenant.id, {
          method: 'PATCH',
          body: JSON.stringify({ assinatura_status: edits.status }),
        });
      }
      toast({ title: 'Empresa atualizada', description: `${tenant.nome || tenant.name} foi atualizado.` });
      setEditingTenant(prev => { const n = { ...prev }; delete n[tenant.id]; return n; });
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSavingId(null);
    }
  };

  const handleExpandTenant = async (tenantId: string) => {
    if (expandedTenant === tenantId) { setExpandedTenant(null); return; }
    setExpandedTenant(tenantId);
    if (!tenantMembers[tenantId]) {
      try {
        const data = await apiFetch('/tenants/' + tenantId + '/users');
        setTenantMembers(prev => ({ ...prev, [tenantId]: data || [] }));
      } catch {
        setTenantMembers(prev => ({ ...prev, [tenantId]: [] }));
      }
    }
  };

  const handleRemoveMember = async (tenantId: string, userId: string) => {
    try {
      await apiFetch('/tenants/' + tenantId + '/users/' + userId, { method: 'DELETE' });
      setTenantMembers(prev => ({
        ...prev,
        [tenantId]: (prev[tenantId] || []).filter((m: any) => m.user_id !== userId),
      }));
      toast({ title: 'Membro removido' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  // Criar nova empresa
  const handleCriarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setCriandoEmpresa(true);
    try {
      const slug = novaEmpresa.nome
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) + '-' + Date.now().toString(36);

      const tenant = await apiFetch('/tenants', {
        method: 'POST',
        body: JSON.stringify({ name: novaEmpresa.nome, slug, plan: novaEmpresa.plano }),
      });

      // Ativar plano no banco
      if (novaEmpresa.plano !== 'sem_plano') {
        await apiFetch('/billing/checkout/simular', {
          method: 'POST',
          body: JSON.stringify({
            plano_id: novaEmpresa.plano,
            app_keys: PLAN_APPS[novaEmpresa.plano] || [],
            periodo: 'mensal',
            tenant_id: tenant.id,
          }),
        });
        await apiFetch('/admin/tenants/' + tenant.id, {
          method: 'PATCH',
          body: JSON.stringify({ assinatura_status: novaEmpresa.status }),
        });
      }

      toast({ title: 'Empresa criada!', description: `${novaEmpresa.nome} cadastrada com sucesso.` });
      setShowNovaEmpresa(false);
      setNovaEmpresa({ nome: '', email: '', plano: 'starter', status: 'trial' });
      await fetchData();
    } catch (err: any) {
      let msg = err.message;
      try { msg = JSON.parse(msg)?.error || msg; } catch {}
      toast({ title: 'Erro ao criar empresa', description: msg, variant: 'destructive' });
    } finally {
      setCriandoEmpresa(false);
    }
  };

  // Criar novo usuário e vincular ao tenant
  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoUsuarioTenantId) return;
    setCriandoUsuario(true);
    try {
      // Criar usuário via admin do Supabase
      const result = await apiFetch('/admin/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          email: novoUsuario.email,
          senha: novoUsuario.senha,
          nome: novoUsuario.nome,
          tenant_id: novoUsuarioTenantId,
          role: novoUsuario.role,
        }),
      });

      const jaExistia = result?.mensagem?.includes("existente");
      toast({
        title: jaExistia ? 'Usuário vinculado!' : 'Usuário criado!',
        description: jaExistia
          ? `${novoUsuario.email} já existia no sistema e foi vinculado à empresa.`
          : `${novoUsuario.email} foi cadastrado e vinculado à empresa.`,
      });
      setShowNovoUsuario(false);
      setNovoUsuario({ email: '', senha: '', nome: '', role: 'member' });

      // Atualizar membros do tenant expandido
      const membros = await apiFetch('/tenants/' + novoUsuarioTenantId + '/users');
      setTenantMembers(prev => ({ ...prev, [novoUsuarioTenantId]: membros || [] }));
    } catch (err: any) {
      let msg = err.message;
      try { msg = JSON.parse(msg)?.error || msg; } catch {}
      toast({ title: 'Erro ao criar usuário', description: msg, variant: 'destructive' });
    } finally {
      setCriandoUsuario(false);
    }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  if (authLoading) return null;

  return (
    <Layout>
      <div className="px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-violet-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Painel Super Admin</h1>
            <p className="text-sm text-muted-foreground">Mirage Ecossistema — gestão de tenants e assinaturas</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => setShowNovaEmpresa(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Empresa
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {[
            { icon: Building2, label: 'Total Empresas', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50', onClick: undefined },
            { icon: CheckCircle2, label: 'Assinaturas Ativas', value: stats.ativos, color: 'text-green-600', bg: 'bg-green-50', onClick: undefined },
            { icon: AlertTriangle, label: 'Em Trial', value: stats.trial, color: 'text-amber-600', bg: 'bg-amber-50', onClick: undefined },
            { icon: TrendingUp, label: 'MRR Estimado', value: `R$ ${stats.receita.toLocaleString('pt-BR')}`, color: 'text-violet-600', bg: 'bg-violet-50', onClick: undefined },
            { icon: ClipboardList, label: 'Leads Pendentes', value: leadsLoading ? '…' : leads.filter(l => l.status === 'novo').length, color: 'text-emerald-700', bg: 'bg-emerald-50', onClick: () => { setFiltroStatus('novo'); filaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
          ].map((s, i) => (
            <Card key={i} className={`border shadow-sm transition-all ${s.onClick ? 'cursor-pointer hover:border-emerald-400 hover:shadow-md' : ''}`} onClick={s.onClick}>
              <CardContent className="pt-5 pb-4">
                <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold">{loading && i < 4 ? '—' : s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                {s.onClick && <p className="text-xs text-emerald-600 mt-1 font-medium">→ Ver fila</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gráfico MRR por Plano */}
        {!loading && tenants.length > 0 && (() => {
          const PRECOS: Record<string, number> = { starter: 197, pro: 397, enterprise: 797 };
          const CORES: Record<string, string> = { starter: '#8B5CF6', pro: '#3B82F6', enterprise: '#F59E0B' };
          const mrrData = ['starter', 'pro', 'enterprise'].map(plano => {
            const ativos = tenants.filter((t: any) => t.plan === plano && t.assinatura_status === 'ativo').length;
            return { plano: plano.charAt(0).toUpperCase() + plano.slice(1), ativos, mrr: ativos * PRECOS[plano], cor: CORES[plano] };
          }).filter(d => d.ativos > 0);

          if (mrrData.length === 0) return null;

          const totalMRR = mrrData.reduce((s, d) => s + d.mrr, 0);

          return (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">MRR por Plano</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Receita mensal recorrente estimada</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-violet-700">R$ {totalMRR.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-muted-foreground">total MRR atual</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-xl p-4 bg-card">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={mrrData} barSize={40}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="plano" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: any, name: string) => [
                          name === 'mrr' ? `R$ ${Number(value).toLocaleString('pt-BR')}` : value,
                          name === 'mrr' ? 'MRR' : 'Tenants'
                        ]}
                        labelStyle={{ fontWeight: 600 }}
                      />
                      <Bar dataKey="mrr" radius={[6, 6, 0, 0]}>
                        {mrrData.map((d, i) => <Cell key={i} fill={d.cor} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {mrrData.map(d => (
                    <div key={d.plano} className="flex items-center gap-3 p-3 border rounded-xl bg-card">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.cor }} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{d.plano}</p>
                        <p className="text-xs text-muted-foreground">{d.ativos} tenant{d.ativos !== 1 ? 's' : ''} ativo{d.ativos !== 1 ? 's' : ''}</p>
                      </div>
                      <p className="text-sm font-bold">R$ {d.mrr.toLocaleString('pt-BR')}</p>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 p-3 border-2 border-dashed rounded-xl">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Em trial (sem receita)</p>
                    </div>
                    <p className="text-sm font-semibold text-amber-600">{tenants.filter((t: any) => t.assinatura_status === 'trial').length} empresas</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Fila de Provisionamento ERP/CRM */}
        {(provisioning.length > 0 || provisioningLoading) && (() => {
          const pendentes = provisioning.filter(p => p.status === 'pending');
          const concluidos = provisioning.filter(p => p.status === 'done');
          return (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Provisionamento ERP / CRM</h2>
                  {pendentes.length > 0 && (
                    <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                      {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={fetchProvisioning} disabled={provisioningLoading}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${provisioningLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>

              {pendentes.length > 0 && (
                <div className="border rounded-xl overflow-hidden mb-3">
                  <div className="bg-orange-50 border-b px-4 py-2.5 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <p className="text-sm font-semibold text-orange-800">Ação necessária — liberar acesso manualmente</p>
                  </div>
                  <div className="divide-y">
                    {pendentes.map((item: any) => (
                      <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.app === 'erp' ? 'bg-slate-100 text-slate-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {item.app === 'erp' ? '⚙️ ERP Mirage' : '💬 CRM Mirage'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">Plano {item.plan} · {new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <p className="text-sm font-semibold">{item.tenant_name}</p>
                          <p className="text-xs text-muted-foreground">{item.tenant_email}</p>
                          {item.app === 'erp' ? (
                            <p className="text-xs text-blue-600 mt-1">
                              → ERP Mirage tenta criar automaticamente. Se falhou, acesse{' '}
                              <a href="https://erp.gestaomirage.com.br" target="_blank" rel="noreferrer" className="underline font-medium">erp.gestaomirage.com.br</a>
                              {' '}e crie o cliente manualmente.
                            </p>
                          ) : (
                            <p className="text-xs text-orange-600 mt-1">
                              → Acesse{' '}
                              <a href="https://mirage.wts.chat" target="_blank" rel="noreferrer" className="underline font-medium">mirage.wts.chat</a>
                              {' '}e crie o usuário para este cliente ({item.tenant_email}).
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 border-green-300 text-green-700 hover:bg-green-50"
                            onClick={() => {
                              const extId = item.app === 'erp' ? prompt('ID do cliente no ERP Mirage (opcional):') || '' : '';
                              markProvisioningDone(item.id, extId);
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Marcar feito
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendentes.length === 0 && (
                <div className="border rounded-xl p-4 bg-green-50 text-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-sm text-green-700 font-medium">Tudo em dia! Nenhum provisionamento pendente.</p>
                </div>
              )}

              {concluidos.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Ver {concluidos.length} concluído{concluidos.length !== 1 ? 's' : ''}
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    {concluidos.slice(0, 10).map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 p-2.5 border rounded-lg bg-card text-sm opacity-60">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <span className="text-xs font-medium">{item.app === 'erp' ? 'ERP Mirage' : 'CRM Mirage'}</span>
                        <span className="flex-1 truncate text-xs text-muted-foreground">{item.tenant_name} · {item.tenant_email}</span>
                        {item.external_id && <span className="text-xs text-muted-foreground">ID: {item.external_id}</span>}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })()}

        {/* Lembretes de Cobrança */}
        {(() => {
          const grupos = lembretes?.grupos;
          const urgentes = lembretes?.total_urgentes ?? 0;
          const temAlgo = grupos && (
            grupos.ja_vencido?.length > 0 ||
            grupos.vence_hoje?.length > 0 ||
            grupos.vence_3dias?.length > 0 ||
            grupos.vence_7dias?.length > 0
          );

          if (!temAlgo && !lembretesLoading) return null;

          const GrupoLembrete = ({ titulo, cor, items, urgente }: { titulo: string; cor: string; items: any[]; urgente?: boolean }) => {
            if (!items?.length) return null;
            return (
              <div className="mb-4">
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${cor}`}>{titulo} ({items.length})</p>
                <div className="space-y-2">
                  {items.map((t: any) => {
                    const msg = msgWhatsApp(t.nome, t.plano, t.dias_restantes);
                    const jaContatado = contatados[t.id];
                    return (
                      <div key={t.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border text-sm ${urgente ? 'bg-red-50 border-red-200' : 'bg-card border-border'} ${jaContatado ? 'opacity-50' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{t.nome}</p>
                          <p className="text-xs text-muted-foreground">{t.email || '—'} · Plano {t.plano} · {t.dias_restantes < 0 ? `Venceu há ${Math.abs(t.dias_restantes)}d` : t.dias_restantes === 0 ? 'Vence hoje' : `${t.dias_restantes}d restantes`}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {jaContatado && <span className="text-xs text-green-600 font-medium">✓ Contatado</span>}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => { navigator.clipboard.writeText(msg); toast({ title: 'Mensagem copiada!' }); }}
                          >
                            <Copy className="w-3 h-3 mr-1" /> Copiar msg
                          </Button>
                          {t.email && (
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2" asChild>
                              <a href={`mailto:${t.email}?subject=Sua assinatura Mirage Hub&body=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">
                                <Mail className="w-3 h-3 mr-1" /> Email
                              </a>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={jaContatado ? 'outline' : 'default'}
                            className="h-7 text-xs px-2"
                            onClick={() => marcarContatado(t.id)}
                            disabled={jaContatado}
                          >
                            <Check className="w-3 h-3 mr-1" /> {jaContatado ? 'Feito' : 'Marcar'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          };

          return (
            <Card className={`shadow-sm mb-6 ${urgentes > 0 ? 'border-red-200' : 'border-amber-200'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bell className={`w-5 h-5 ${urgentes > 0 ? 'text-red-500' : 'text-amber-500'}`} />
                    Régua de Cobrança
                    {urgentes > 0 && <Badge variant="destructive" className="ml-1">{urgentes} urgente{urgentes !== 1 ? 's' : ''}</Badge>}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={fetchLembretes} disabled={lembretesLoading}>
                    <RefreshCw className={`w-4 h-4 ${lembretesLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <CardDescription>Clientes que precisam de contato. Copie a mensagem ou envie por email.</CardDescription>
              </CardHeader>
              <CardContent>
                {lembretesLoading ? (
                  <Skeleton className="h-24 w-full rounded-lg" />
                ) : (
                  <>
                    <GrupoLembrete titulo="🔴 Já vencido" cor="text-red-600" items={grupos?.ja_vencido} urgente />
                    <GrupoLembrete titulo="🟠 Vence hoje" cor="text-orange-600" items={grupos?.vence_hoje} urgente />
                    <GrupoLembrete titulo="🟡 Vence em 1-3 dias" cor="text-amber-600" items={grupos?.vence_3dias} />
                    <GrupoLembrete titulo="🔵 Vence em 4-7 dias" cor="text-blue-600" items={grupos?.vence_7dias} />
                    {!temAlgo && <p className="text-sm text-muted-foreground text-center py-4">Nenhum cliente com vencimento próximo. 🎉</p>}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Tenants */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Empresas ({tenants.length})
            </CardTitle>
            <CardDescription>
              Clique em uma empresa para ver e gerenciar membros. Altere plano ou status e salve.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="mb-4">Nenhuma empresa cadastrada ainda.</p>
                <Button size="sm" onClick={() => setShowNovaEmpresa(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Cadastrar primeira empresa
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {tenants.map((tenant) => {
                  const editing = editingTenant[tenant.id] || {};
                  const currentPlan = editing.plano ?? tenant.plano ?? 'sem_plano';
                  const currentStatus = editing.status ?? tenant.assinatura_status ?? 'trial';
                  const hasChanges = editing.plano !== undefined || editing.status !== undefined;
                  const isExpanded = expandedTenant === tenant.id;
                  const members = tenantMembers[tenant.id] || [];

                  return (
                    <div key={tenant.id} className="rounded-xl border bg-card overflow-hidden">
                      {/* Linha principal */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-muted/20 transition-colors">
                        <button
                          className="flex-1 text-left min-w-0"
                          onClick={() => handleExpandTenant(tenant.id)}
                        >
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">{tenant.nome || tenant.name || 'Sem nome'}</p>
                            <span className="text-xs text-muted-foreground font-mono shrink-0">/{tenant.slug}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Criado em {formatDate(tenant.created_at)}
                            {tenant.assinatura_expira_em && ` · Vence em ${formatDate(tenant.assinatura_expira_em)}`}
                          </p>
                        </button>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Select value={currentPlan} onValueChange={(v) => handleEdit(tenant.id, 'plano', v)}>
                            <SelectTrigger className="h-8 text-xs w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PLAN_OPTIONS.map(p => (
                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select value={currentStatus} onValueChange={(v) => handleEdit(tenant.id, 'status', v)}>
                            <SelectTrigger className="h-8 text-xs w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map(s => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {hasChanges && (
                            <Button size="sm" className="h-8 text-xs" onClick={() => handleSave(tenant)} disabled={savingId === tenant.id}>
                              {savingId === tenant.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleExpandTenant(tenant.id)}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Membros expandidos */}
                      {isExpanded && (
                        <div className="border-t bg-muted/20 px-4 py-3">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" /> Membros ({members.length})
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => { setNovoUsuarioTenantId(tenant.id); setShowNovoUsuario(true); }}
                            >
                              <UserPlus className="w-3.5 h-3.5 mr-1" />
                              Adicionar usuário
                            </Button>
                          </div>

                          {members.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2">Nenhum membro vinculado a esta empresa.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {members.map((m: any) => (
                                <div key={m.user_id} className="flex items-center justify-between text-xs bg-background rounded-lg px-3 py-2 border">
                                  <div>
                                    <span className="font-medium">{m.user?.email || m.user_id}</span>
                                    <span className="ml-2 text-muted-foreground capitalize">· {m.role}</span>
                                  </div>
                                  {m.role !== 'owner' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-red-600"
                                      onClick={() => handleRemoveMember(tenant.id, m.user_id)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal: Nova Empresa */}
      <Dialog open={showNovaEmpresa} onOpenChange={setShowNovaEmpresa}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-violet-600" />
              Cadastrar Nova Empresa
            </DialogTitle>
            <DialogDescription>
              Crie um tenant e configure o plano inicial. O acesso aos apps é ativado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCriarEmpresa}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="ne-nome">Nome da Empresa *</Label>
                <Input
                  id="ne-nome"
                  required
                  value={novaEmpresa.nome}
                  onChange={(e) => setNovaEmpresa({ ...novaEmpresa, nome: e.target.value })}
                  placeholder="R2PB Confecções LTDA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ne-email">E-mail de Contato</Label>
                <Input
                  id="ne-email"
                  type="email"
                  value={novaEmpresa.email}
                  onChange={(e) => setNovaEmpresa({ ...novaEmpresa, email: e.target.value })}
                  placeholder="contato@empresa.com.br"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Plano Inicial</Label>
                  <Select value={novaEmpresa.plano} onValueChange={(v) => setNovaEmpresa({ ...novaEmpresa, plano: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAN_OPTIONS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label.split(' —')[0]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={novaEmpresa.status} onValueChange={(v) => setNovaEmpresa({ ...novaEmpresa, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {novaEmpresa.plano !== 'sem_plano' && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  Apps que serão liberados: <strong>{(PLAN_APPS[novaEmpresa.plano] || []).join(', ')}</strong>
                </div>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setShowNovaEmpresa(false)}>Cancelar</Button>
              <Button type="submit" disabled={criandoEmpresa}>
                {criandoEmpresa ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Plus className="mr-2 w-4 h-4" />}
                {criandoEmpresa ? 'Criando...' : 'Criar Empresa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Novo Usuário */}
      <Dialog open={showNovoUsuario} onOpenChange={setShowNovoUsuario}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-violet-600" />
              Adicionar Usuário
            </DialogTitle>
            <DialogDescription>
              Crie um novo usuário no Supabase e vincule-o à empresa selecionada.
            </DialogDescription>
          </DialogHeader>

          {/* Seletor de empresa se não veio de expand */}
          {!novoUsuarioTenantId && (
            <div className="space-y-2 py-2">
              <Label>Empresa</Label>
              <Select value={novoUsuarioTenantId} onValueChange={setNovoUsuarioTenantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nome || t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {novoUsuarioTenantId && (
            <div className="text-xs bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 text-violet-800">
              Empresa: <strong>{tenants.find(t => t.id === novoUsuarioTenantId)?.nome || tenants.find(t => t.id === novoUsuarioTenantId)?.name}</strong>
            </div>
          )}

          <form onSubmit={handleCriarUsuario}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="nu-nome">Nome Completo</Label>
                <Input
                  id="nu-nome"
                  value={novoUsuario.nome}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })}
                  placeholder="João da Silva"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nu-email">E-mail *</Label>
                <Input
                  id="nu-email"
                  type="email"
                  required
                  value={novoUsuario.email}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })}
                  placeholder="usuario@empresa.com.br"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nu-senha">Senha Inicial *</Label>
                <Input
                  id="nu-senha"
                  type="password"
                  required
                  minLength={6}
                  value={novoUsuario.senha}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, senha: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label>Papel na Empresa</Label>
                <Select value={novoUsuario.role} onValueChange={(v) => setNovoUsuario({ ...novoUsuario, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Proprietário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="member">Membro</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => { setShowNovoUsuario(false); setNovoUsuarioTenantId(''); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={criandoUsuario || !novoUsuarioTenantId}>
                {criandoUsuario ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <UserPlus className="mr-2 w-4 h-4" />}
                {criandoUsuario ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
        {/* ─── CAPTAÇÃO R2PB ───────────────────────────────────────── */}
        <div className="mt-10 px-4">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">

              {/* QR Code */}
              <div className="shrink-0 bg-white rounded-xl p-3 border border-emerald-200 shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(window.location.origin + '/hub/comunidade/cadastro-fornecedor')}&size=140x140&margin=6&color=065f46&bgcolor=ffffff`}
                  alt="QR Code landing page"
                  width={140}
                  height={140}
                  className="rounded-lg"
                />
                <p className="text-xs text-center text-emerald-700 font-medium mt-2">Escaneie para cadastrar</p>
              </div>

              {/* Info + link */}
              <div className="flex-1 min-w-0 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <QrCode className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-bold text-emerald-900">Link de Captação — Comunidade R2PB</h3>
                  </div>
                  <p className="text-sm text-emerald-800">Compartilhe este link com fornecedores que deseja convidar. Cada cadastro entra automaticamente na fila abaixo com score de qualidade.</p>
                </div>

                {/* URL copiável */}
                <div className="bg-white rounded-xl border border-emerald-200 p-3 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-mono text-emerald-900 flex-1 truncate select-all">
                    {window.location.origin}/hub/comunidade/cadastro-fornecedor
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin + '/hub/comunidade/cadastro-fornecedor');
                      setLinkCopiado(true);
                      setTimeout(() => setLinkCopiado(false), 2500);
                    }}
                    className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all
                      ${linkCopiado ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                  >
                    {linkCopiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {linkCopiado ? 'Copiado!' : 'Copiar'}
                  </button>
                  <a
                    href="/hub/comunidade/cadastro-fornecedor"
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir
                  </a>
                </div>

                {/* Ações rápidas */}
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/hub/comunidade/landing"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Ver Landing Page
                  </a>
                  <a
                    href="/hub/comunidade/criativo"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 font-semibold transition-all"
                  >
                    <QrCode className="w-3.5 h-3.5" /> Criativo / QR Code
                  </a>
                </div>

                {/* Dicas rápidas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-emerald-800">
                  {[
                    { emoji: '📲', texto: 'Envie o QR Code pelo WhatsApp Business' },
                    { emoji: '📸', texto: 'Cole o link no perfil do Instagram' },
                    { emoji: '📋', texto: 'Adicione ao seu e-mail de apresentação' },
                  ].map((d, i) => (
                    <div key={i} className="bg-white/70 rounded-lg p-2.5 border border-emerald-100">
                      <span className="mr-1">{d.emoji}</span>{d.texto}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ─── CURADORIA — movida para Hub → Comunidade → Pipeline ── */}
        <div ref={filaRef} className="mt-8 px-4 pb-6">
          <div className="flex items-center gap-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 text-amber-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Curadoria centralizada</p>
              <p className="text-xs text-amber-700 mt-0.5">A gestão de leads do Moda Conecta agora está no Pipeline de Curadoria dentro de Comunidade.</p>
            </div>
            <a
              href="/hub/comunidade"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ir para o Pipeline
            </a>
          </div>
        </div>

      {/* ═══════════════════════════════════════════════════════════
          LEADS MIRA — leads capturados pelo chatbot
          ════════════════════════════════════════════════════════════ */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Leads Mira</h2>
            <p className="text-sm text-muted-foreground">Visitantes que interagiram com o chatbot Mira</p>
          </div>
          <Button onClick={carregarMiraLeads} disabled={miraLeadsLoading} size="sm" variant="outline">
            {miraLeadsLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Carregar leads
          </Button>
        </div>

        {miraLeads.length > 0 && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Nome</th>
                  <th className="text-left px-4 py-2 font-medium">WhatsApp</th>
                  <th className="text-left px-4 py-2 font-medium">Email</th>
                  <th className="text-left px-4 py-2 font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {miraLeads.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium">{lead.nome}</td>
                    <td className="px-4 py-2">
                      {lead.whatsapp ? (
                        <a href={`https://wa.me/55${lead.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                          {lead.whatsapp}
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{lead.email ?? '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {new Date(lead.created_at).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {miraLeads.length === 0 && !miraLeadsLoading && (
          <div className="bg-muted/30 rounded-2xl border border-dashed p-8 text-center text-muted-foreground text-sm">
            Clique em "Carregar leads" para ver os visitantes que conversaram com a Mira.
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CONFIGURAR FASES KANBAN por tenant (somente super-admin)
          ════════════════════════════════════════════════════════════ */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">Configurar Fases do Kanban</h2>
          <p className="text-sm text-muted-foreground">Configure nomes, visibilidade e cores das fases por tenant. Padrão de fábrica: r2pb.</p>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tenant ID</label>
            <Select
              value={faseConfigTenantId}
              onValueChange={v => { setFaseConfigTenantId(v); carregarFaseConfig(v); }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione um tenant..." />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome_empresa ?? t.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {faseConfig.length > 0 && (
            <Button onClick={salvarFaseConfigAdmin} disabled={faseConfigSavingAdmin} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
              {faseConfigSavingAdmin ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Salvar configuração
            </Button>
          )}
        </div>

        {faseConfigLoading && (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted/40 animate-pulse rounded-lg" />)}</div>
        )}

        {!faseConfigLoading && faseConfig.length > 0 && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-2 font-medium w-28">Fase</th>
                  <th className="text-left px-4 py-2 font-medium">Nome de exibição</th>
                  <th className="text-center px-4 py-2 font-medium w-20">Oculta</th>
                  <th className="text-center px-4 py-2 font-medium w-16">Ordem</th>
                  <th className="text-left px-4 py-2 font-medium w-32">Tipo modal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {faseConfig.map((fase: any, idx: number) => (
                  <tr key={fase.fase_id} className="hover:bg-muted/10">
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{fase.fase_id}</td>
                    <td className="px-4 py-2">
                      <Input
                        value={fase.nomeExibicao ?? ''}
                        onChange={e => {
                          const updated = [...faseConfig];
                          updated[idx] = { ...fase, nomeExibicao: e.target.value };
                          setFaseConfig(updated);
                        }}
                        className="h-7 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={fase.oculta ?? false}
                        onChange={e => {
                          const updated = [...faseConfig];
                          updated[idx] = { ...fase, oculta: e.target.checked };
                          setFaseConfig(updated);
                        }}
                        className="w-4 h-4 accent-violet-600"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Input
                        type="number"
                        value={fase.ordem ?? ''}
                        onChange={e => {
                          const updated = [...faseConfig];
                          updated[idx] = { ...fase, ordem: Number(e.target.value) };
                          setFaseConfig(updated);
                        }}
                        className="h-7 text-sm text-center w-14"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Select
                        value={fase.tipoModal ?? '__none__'}
                        onValueChange={v => {
                          const updated = [...faseConfig];
                          updated[idx] = { ...fase, tipoModal: v === '__none__' ? null : v, abreModal: v !== '__none__' };
                          setFaseConfig(updated);
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— sem modal</SelectItem>
                          <SelectItem value="produtiva">produtiva</SelectItem>
                          <SelectItem value="tecido">tecido</SelectItem>
                          <SelectItem value="expedicao">expedição</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!faseConfigLoading && !faseConfig.length && faseConfigTenantId && (
          <div className="bg-muted/30 rounded-2xl border border-dashed p-8 text-center text-muted-foreground text-sm">
            Nenhuma configuração encontrada — usando padrão r2pb.
          </div>
        )}
      </div>

    </Layout>
  );
}
